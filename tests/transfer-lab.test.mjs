import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, planRoute, runRoute, FIXED_ROUTE, SCENARIOS } from '../docs/transfer-lab.js';

test('the same stored route exposes each intended transfer failure', () => {
  const training = runRoute(createWorld('training'), FIXED_ROUTE);
  assert.equal(training.status, 'success');
  assert.equal(training.steps.length, 8);
  assert.deepEqual(training.position, [1, 5]);

  const layout = runRoute(createWorld('layout'), FIXED_ROUTE);
  assert.equal(layout.status, 'blocked');
  assert.deepEqual(layout.position, [5, 2]);
  assert.deepEqual(layout.steps.at(-1).attempted, [5, 3]);
  assert.equal(layout.steps.length, 2, 'stop immediately on the wall');

  const controls = runRoute(createWorld('controls'), FIXED_ROUTE);
  assert.equal(controls.status, 'blocked');
  assert.deepEqual(controls.position, [1, 1]);
  assert.deepEqual(controls.steps.at(-1).attempted, [1, 0]);
  assert.equal(controls.steps.length, 5);

  const goal = runRoute(createWorld('goal'), FIXED_ROUTE);
  assert.equal(goal.status, 'missed');
  assert.deepEqual(goal.position, [1, 5]);
  assert.equal(goal.steps.length, 8);
});

test('search succeeds in all four scenarios under their actual controls', () => {
  for (const { id } of SCENARIOS) {
    const world = createWorld(id);
    const route = planRoute(world);
    assert.ok(Array.isArray(route), `${id} has a route`);
    const result = runRoute(world, route);
    assert.equal(result.status, 'success', id);
    assert.deepEqual(result.position, world.goal, id);
    assert.equal(result.steps.some((step) => step.blocked), false, id);
    assert.equal(route.length, id === 'goal' ? 4 : 8, `${id}: shortest length`);
  }
});

test('rotated commands are planned in command space, not copied as physical directions', () => {
  const world = createWorld('controls');
  assert.deepEqual(stepWorld(world, [5, 4], 'N').position, [5, 3]);
  assert.deepEqual(stepWorld(world, [4, 4], 'E').position, [3, 4]);
  assert.deepEqual(stepWorld(world, [4, 4], 'S').position, [4, 5]);
  assert.deepEqual(stepWorld(world, [4, 4], 'W').position, [5, 4]);
  assert.deepEqual(planRoute(world), ['E', 'E', 'E', 'E', 'S', 'S', 'S', 'S']);
});

test('blocked actions preserve state and unreachable goals return no route', () => {
  const world = createWorld();
  const start = [...world.start];
  const blocked = stepWorld(world, start, 'W');
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.position, start);
  assert.deepEqual(start, world.start, 'input position is not mutated');
  world.walls.add('4,1');
  world.walls.add('5,2');
  assert.equal(planRoute(world), null);
  assert.deepEqual(planRoute(createWorld(), [1, 5]), []);
});

test('world instances do not share mutable controls or wall state', () => {
  const first = createWorld();
  const second = createWorld();
  first.walls.add('1,1');
  first.actionVectors.N[0] = 1;
  assert.equal(second.walls.has('1,1'), false);
  assert.deepEqual(second.actionVectors.N, [-1, 0]);
  assert.throws(() => createWorld('unknown'), RangeError);
  assert.throws(() => stepWorld(second, second.start, 'X'), RangeError);
});
