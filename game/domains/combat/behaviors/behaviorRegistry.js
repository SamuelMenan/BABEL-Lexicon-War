// Strategy registry — selecciona behavior por tipo de enemigo.
import { ScoutBehavior }    from './ScoutBehavior.js';
import { SentinelBehavior } from './SentinelBehavior.js';
import { GuardianBehavior } from './GuardianBehavior.js';
import { PhantomBehavior }  from './PhantomBehavior.js';
import { ApexBehavior }     from './ApexBehavior.js';
import { NullBehavior }     from './NullBehavior.js';

const REGISTRY = {
  scout:    ScoutBehavior,
  sentinel: SentinelBehavior,
  guardian: GuardianBehavior,
  phantom:  PhantomBehavior,
  apex:     ApexBehavior,
};

export function createBehavior(type) {
  const Cls = REGISTRY[type] ?? NullBehavior;
  return new Cls();
}
