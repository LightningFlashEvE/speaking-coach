import { Injectable } from '@nestjs/common';
import { scenarios, Scenario } from '@speaking-coach/shared';

@Injectable()
export class ScenarioService {
  getAllScenarios(): Omit<Scenario, 'systemPrompt' | 'targetExpressions'>[] {
    return scenarios.map(({ systemPrompt, targetExpressions, ...rest }) => rest);
  }

  getScenarioById(id: string): Scenario | undefined {
    return scenarios.find(s => s.id === id);
  }
}
