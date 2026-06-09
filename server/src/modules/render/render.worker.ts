import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import type { RenderTemplate, RenderTemplatePage } from '../../types/render-types';
import { renderPageToPng } from './render-engine';
import { uniqueExportFileName } from './utils/renderTemplate';

export interface RenderJobProgress {
  success: number;
  failed: number;
  progress: number;
  errors: { rowIndex: number; pageIndex?: number; message: string }[];
}

export interface RenderWorkerOptions {
  template: RenderTemplate;
  rows: Record<string, string | number>[];
  jobId: string;
  fileNamePrefix?: string;
  fileNameTemplate?: string;
  multiplier?: number;
  onProgress?: (state: RenderJobProgress) => void;
}

export interface RenderWorkerResult {
  zipPath: string;
  success: number;
  failed: number;
  errors: { rowIndex: number; pageIndex?: number; message: string }[];
}

function getJobDir(jobId: string): string {
  return path.join(os.tmpdir(), 'label-design', jobId);
}

async function writePngFiles(
  pages: RenderTemplatePage[],
  rows: Record<string, string | number>[],
  outputDir: string,
  fileNamePrefix: string,
  fileNameTemplate: string | undefined,
  multiplier: number,
  onProgress?: (state: RenderJobProgress) => void,
): Promise<RenderJobProgress> {
  await fs.mkdir(outputDir, { recursive: true });

  const total = rows.length * pages.length;
  let done = 0;
  let success = 0;
  let failed = 0;
  const errors: RenderJobProgress['errors'] = [];
  const usedNames = new Map<string, number>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const fileName = uniqueExportFileName(
        rowIndex,
        pageIndex,
        pages.length,
        fileNamePrefix,
        rows[rowIndex],
        usedNames,
        fileNameTemplate,
      );

      try {
        const buffer = await renderPageToPng(page, rows[rowIndex], { multiplier });
        await fs.writeFile(path.join(outputDir, fileName), buffer);
        success++;
      } catch (err) {
        failed++;
        errors.push({
          rowIndex: rowIndex + 1,
          pageIndex: pageIndex + 1,
          message: err instanceof Error ? err.message : String(err),
        });
      }

      done++;
      onProgress?.({
        success,
        failed,
        progress: Math.round((done / total) * 100),
        errors,
      });
    }
  }

  return { success, failed, progress: 100, errors };
}

async function createZip(sourceDir: string, zipPath: string): Promise<void> {
  await fs.mkdir(path.dirname(zipPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve());
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/** 批量渲染并打包 ZIP */
export async function runRenderWorker(
  options: RenderWorkerOptions,
): Promise<RenderWorkerResult> {
  const {
    template,
    rows,
    jobId,
    fileNamePrefix = template.name || 'label',
    fileNameTemplate,
    multiplier = 2,
    onProgress,
  } = options;

  const pages = template.pages?.length ? template.pages : [];
  if (pages.length === 0) {
    throw new Error('Template has no pages');
  }
  if (rows.length === 0) {
    throw new Error('No data rows to render');
  }

  const jobDir = getJobDir(jobId);
  const pngDir = path.join(jobDir, 'png');
  const zipPath = path.join(jobDir, `${fileNamePrefix}.zip`);

  const state = await writePngFiles(
    pages,
    rows,
    pngDir,
    fileNamePrefix,
    fileNameTemplate,
    multiplier,
    onProgress,
  );

  if (state.success === 0) {
    throw new Error('All rows failed to render');
  }

  await createZip(pngDir, zipPath);

  return {
    zipPath,
    success: state.success,
    failed: state.failed,
    errors: state.errors,
  };
}

export async function cleanupJobDir(jobId: string): Promise<void> {
  const jobDir = getJobDir(jobId);
  await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
}

export function getZipPathForJob(jobId: string, fileNamePrefix: string): string {
  return path.join(getJobDir(jobId), `${fileNamePrefix}.zip`);
}
