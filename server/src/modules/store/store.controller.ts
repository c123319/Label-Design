import { Controller, Get, Param } from '@nestjs/common';
import { StoreService } from './store.service';

/**
 * 自部署后端模板库 / 素材库接口（只读）。
 *
 * 路径刻意与 GitHub template-store 仓库的文件结构一致，便于前端统一处理：
 *   GET /api/store/manifest          → manifest.json
 *   GET /api/store/categories        → categories.json
 *   GET /api/store/templates/:id     → templates/:id.json
 *   GET /api/store/assets-manifest   → assets-manifest.json
 */
@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('manifest')
  getManifest() {
    return this.storeService.getManifest();
  }

  @Get('categories')
  getCategories() {
    return this.storeService.getCategories();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.storeService.getTemplate(id);
  }

  @Get('assets-manifest')
  getAssetsManifest() {
    return this.storeService.getAssetsManifest();
  }
}
