import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';

@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @Get()
  async findAll() {
    return this.athletesService.findAll();
  }

  @Post('check-duplicate')
  @HttpCode(200)
  async checkDuplicate(@Body() dto: CheckDuplicateDto) {
    return this.athletesService.checkDuplicate(dto);
  }

  @Post()
  async create(@Body() dto: CreateAthleteDto) {
    return this.athletesService.create(dto);
  }
}
