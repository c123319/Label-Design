import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { TemplateService } from './template.service';

@Controller('api/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  create(@Body() body: any) {
    return this.templateService.create(body);
  }

  @Get()
  findAll() {
    return this.templateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.templateService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }

  /** 保存模板元素 → 数据字段的绑定关系 */
  @Post(':id/bindings')
  saveBindings(
    @Param('id') id: string,
    @Body() body: { bindings: any[] },
  ) {
    return this.templateService.saveBindings(id, body.bindings ?? []);
  }

  /** 设置模板默认关联的数据源 */
  @Put(':id/data-source')
  setDataSource(
    @Param('id') id: string,
    @Body() body: { dataSourceId: string | null },
  ) {
    return this.templateService.setDataSource(id, body.dataSourceId ?? null);
  }
}
