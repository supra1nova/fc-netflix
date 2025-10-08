import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
} from '@nestjs/common'
import { DirectorService } from './director.service'
import { CreateDirectorDto } from './dto/create-director.dto'
import { UpdateDirectorDto } from './dto/update-director.dto'
import { ApiBearerAuth } from '@nestjs/swagger'

@Controller('director')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Get()
  getListDirector(@Query('name') name?: string) {
    return this.directorService.findListDirector(name)
  }

  @Get(':id')
  getOneDirector(@Param('id', new ParseIntPipe()) id: number) {
    return this.directorService.findOneDirector(id)
  }

  @Post()
  postDirector(@Body() createDirectorDto: CreateDirectorDto) {
    return this.directorService.createDirector(createDirectorDto)
  }

  @Patch(':id')
  patchDirector(@Param('id', new ParseIntPipe()) id: number, @Body() updateDirectorDto: UpdateDirectorDto) {
    return this.directorService.updateDirector(id, updateDirectorDto)
  }

  @Delete(':id')
  deleteDirector(@Param('id', new ParseIntPipe()) id: number) {
    return this.directorService.deleteDirector(+id)
  }
}
