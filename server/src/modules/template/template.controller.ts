import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}
