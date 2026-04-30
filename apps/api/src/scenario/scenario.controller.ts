import { Controller, Get } from '@nestjs/common';
import { ScenarioService } from './scenario.service';

@Controller('api/scenarios')
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  getScenarios() {
    return this.scenarioService.getAllScenarios();
  }
}
