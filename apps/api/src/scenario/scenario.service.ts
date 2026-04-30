import { Injectable } from '@nestjs/common';
import { scenarios, Scenario } from '@speaking-coach/shared';

@Injectable()
export class ScenarioService {
  getAllScenarios(): Omit<Scenario, 'systemPrompt' | 'targetExpressions'>[] {
    return scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      subtitle: scenario.subtitle,
      icon: scenario.icon,
      level: scenario.level,
      role: scenario.role,
      goal: scenario.goal,
      openingLine: scenario.openingLine,
      isPremium: scenario.isPremium,
    }));
  }

  getScenarioById(id: string): Scenario | undefined {
    return scenarios.find((scenario) => scenario.id === id);
  }
}
