/** An illustrative gridworld. No model is called and no benchmark is measured. */
export const FIXED_ROUTE = Object.freeze(['E', 'E', 'E', 'E', 'N', 'N', 'N', 'N']);
export const SCENARIOS = Object.freeze([
  { id: 'training', label: 'Training layout', detail: 'The stored route was written for this layout and goal.' },
  { id: 'layout', label: 'New layout', detail: 'An extra wall blocks the stored route. The goal and controls stay the same.' },
  { id: 'controls', label: 'Changed controls', detail: 'Every command now moves 90° counterclockwise. The layout and goal stay the same.' },
  { id: 'goal', label: 'New goal', detail: 'The destination has moved. The stored route still leads to the old destination.' }
]);

const NORMAL_VECTORS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const ROTATED_VECTORS = { N: [0, -1], E: [-1, 0], S: [0, 1], W: [1, 0] };
const COMMANDS = ['N', 'E', 'S', 'W'];
const KEY = ([row, col]) => `${row},${col}`;
const SAME = (a, b) => a[0] === b[0] && a[1] === b[1];
const COORD = ([row, col]) => `row ${row + 1}, column ${col + 1}`;
let instanceCount = 0;

export function createWorld(scenario = 'training') {
  if (!SCENARIOS.some((item) => item.id === scenario)) throw new RangeError(`Unknown scenario: ${scenario}`);
  const walls = new Set();
  for (let i = 0; i < 7; i += 1) {
    walls.add(KEY([0, i])); walls.add(KEY([6, i]));
    walls.add(KEY([i, 0])); walls.add(KEY([i, 6]));
  }
  [[2, 2], [2, 3], [3, 3], [4, 3]].forEach((cell) => walls.add(KEY(cell)));
  if (scenario === 'layout') walls.add(KEY([5, 3]));
  const vectors = scenario === 'controls' ? ROTATED_VECTORS : NORMAL_VECTORS;
  return {
    scenario, size: 7, start: [5, 1], goal: scenario === 'goal' ? [1, 1] : [1, 5], walls,
    actionVectors: Object.fromEntries(COMMANDS.map((action) => [action, [...vectors[action]]]))
  };
}

/** Apply a command, preserving the position on a blocked move. */
export function stepWorld(world, position, action) {
  if (!Object.hasOwn(world.actionVectors, action)) throw new RangeError(`Unknown command: ${action}`);
  const [dr, dc] = world.actionVectors[action];
  const next = [position[0] + dr, position[1] + dc];
  const blocked = next[0] < 0 || next[0] >= world.size || next[1] < 0 || next[1] >= world.size || world.walls.has(KEY(next));
  return { action, from: [...position], position: blocked ? [...position] : next, attempted: next, blocked, reached: !blocked && SAME(next, world.goal) };
}

/** Breadth-first search over commands under this world's actual control mapping. */
export function planRoute(world, from = world.start) {
  if (SAME(from, world.goal)) return [];
  const queue = [[...from]];
  const parents = new Map([[KEY(from), null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const action of COMMANDS) {
      const result = stepWorld(world, current, action);
      const key = KEY(result.position);
      if (result.blocked || parents.has(key)) continue;
      parents.set(key, { previous: KEY(current), action });
      if (result.reached) {
        const route = [];
        let cursor = key;
        while (parents.get(cursor)) {
          const entry = parents.get(cursor);
          route.push(entry.action);
          cursor = entry.previous;
        }
        return route.reverse();
      }
      queue.push(result.position);
    }
  }
  return null;
}

/** Execute until a wall, the goal, or the end of the command list. */
export function runRoute(world, route) {
  let position = [...world.start];
  const trajectory = [[...position]];
  const steps = [];
  for (const action of route) {
    const step = stepWorld(world, position, action);
    steps.push(step);
    if (step.blocked) return { status: 'blocked', position, trajectory, steps };
    position = step.position;
    trajectory.push([...position]);
    if (step.reached) return { status: 'success', position, trajectory, steps };
  }
  return { status: SAME(position, world.goal) ? 'success' : 'missed', position, trajectory, steps };
}

export function initTransferLab(root) {
  if (!root || typeof root.querySelector !== 'function') throw new TypeError('A root element is required.');
  const win = root.ownerDocument.defaultView;
  const uid = `transfer-demo-${++instanceCount}`;
  root.classList.add('transfer-lab');
  root.innerHTML = `
    <div class="tl-topline"><span class="tl-eyebrow">A SMALL TRANSFER EXPERIMENT</span><span class="tl-disclaimer">Scripted demonstration · no model performance</span></div>
    <div class="tl-intro"><h3>Same route. Different world.</h3><p>Change the layout, controls, or goal to see why a familiar sequence of actions may stop working.</p></div>
    <div class="tl-scenarios" role="group" aria-label="Choose a demonstration scenario">
      ${SCENARIOS.map((item, index) => `<button type="button" data-scenario="${item.id}" aria-pressed="${index === 0}"><span>0${index + 1}</span>${item.label}</button>`).join('')}
    </div>
    <div class="tl-workspace">
      <div class="tl-world">
        <svg class="tl-grid" viewBox="0 0 382 382" role="img" aria-labelledby="${uid}-title ${uid}-description"></svg>
        <div class="tl-legend" aria-label="Grid legend"><span><i class="tl-key-player"></i>Player</span><span><i class="tl-key-goal"></i>Goal</span><span><i class="tl-key-wall"></i>Wall</span><span><i class="tl-key-path"></i>Path taken</span></div>
      </div>
      <div class="tl-console">
        <div class="tl-scenario-copy"><span class="tl-small-label">CURRENT WORLD</span><h4></h4><p></p></div>
        <div class="tl-control-map"><span class="tl-small-label">COMMAND → MOVEMENT</span><div class="tl-mapping"></div></div>
        <div class="tl-route"><span class="tl-small-label">COMMAND SEQUENCE</span><div class="tl-commands" aria-label="Planned command sequence"></div><p class="tl-route-note">Stored route: E × 4, then N × 4.</p></div>
        <div class="tl-actions"><button type="button" class="tl-run" data-action="fixed">Run fixed route</button><button type="button" class="tl-replan" data-action="replan">Replan for this world</button><button type="button" class="tl-reset" data-action="reset">Reset</button></div>
        <div class="tl-status" aria-live="polite" aria-atomic="true"><span class="tl-status-label">READY</span><p class="tl-status-text"></p><p class="tl-trace"></p></div>
      </div>
    </div>
    <p class="tl-method">This illustration uses a stored route and breadth-first search with full access to the grid and controls. Replanning is an explicit search procedure; it does not demonstrate learning or transfer by a foundation model.</p>`;

  const svg = root.querySelector('.tl-grid');
  const commandsElement = root.querySelector('.tl-commands');
  const statusElement = root.querySelector('.tl-status');
  const statusLabel = root.querySelector('.tl-status-label');
  const statusText = root.querySelector('.tl-status-text');
  const traceElement = root.querySelector('.tl-trace');
  const routeNote = root.querySelector('.tl-route-note');
  const runButtons = [root.querySelector('[data-action="fixed"]'), root.querySelector('[data-action="replan"]')];
  let world = createWorld();
  let trajectory = [[...world.start]];
  let position = [...world.start];
  let timer = null;
  let generation = 0;
  let selectedRoute = [...FIXED_ROUTE];
  let completedCommands = 0;
  let attemptedCell = null;
  let lastAction = null;
  let destroyed = false;
  const motionPreference = win.matchMedia?.('(prefers-reduced-motion: reduce)');

  function cancel() {
    generation += 1;
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
    runButtons.forEach((button) => { button.disabled = false; });
  }

  function renderGrid() {
    const unit = 46;
    const inset = 36;
    const center = ([row, col]) => [inset + col * unit + unit / 2, inset + row * unit + unit / 2];
    const scenario = SCENARIOS.find((item) => item.id === world.scenario);
    const description = `Seven by seven grid. ${scenario.label}. Player at ${COORD(position)}. Start at ${COORD(world.start)}. Goal at ${COORD(world.goal)}. The outer border and ${world.scenario === 'layout' ? 'five' : 'four'} interior cells are walls. ${world.scenario === 'controls' ? 'Commands are rotated counterclockwise.' : 'Commands follow the compass directions.'} ${trajectory.length - 1} completed moves.`;
    let markup = `<title id="${uid}-title">${scenario.label}: player and goal</title><desc id="${uid}-description">${description}</desc>`;
    for (let i = 0; i < world.size; i += 1) {
      markup += `<text class="tl-axis" x="${inset + i * unit + unit / 2}" y="23" text-anchor="middle">${i + 1}</text><text class="tl-axis" x="19" y="${inset + i * unit + unit / 2 + 4}" text-anchor="middle">${i + 1}</text>`;
    }
    for (let row = 0; row < world.size; row += 1) {
      for (let col = 0; col < world.size; col += 1) {
        const isWall = world.walls.has(KEY([row, col]));
        const isNew = world.scenario === 'layout' && row === 5 && col === 3;
        markup += `<rect class="tl-cell${isWall ? ' tl-wall' : ''}${isNew ? ' tl-new-wall' : ''}" x="${inset + col * unit + 2}" y="${inset + row * unit + 2}" width="42" height="42" rx="7"/>`;
      }
    }
    if (trajectory.length > 1) markup += `<polyline class="tl-trail" points="${trajectory.map((cell) => center(cell).join(',')).join(' ')}"/>`;
    const [sx, sy] = center(world.start);
    markup += `<circle class="tl-start" cx="${sx}" cy="${sy}" r="12"/><text class="tl-start-label" x="${sx}" y="${sy + 4}" text-anchor="middle">S</text>`;
    const [gx, gy] = center(world.goal);
    markup += `<rect class="tl-goal" x="${gx - 13}" y="${gy - 13}" width="26" height="26" rx="7"/><text class="tl-goal-label" x="${gx}" y="${gy + 4}" text-anchor="middle">G</text>`;
    if (attemptedCell) {
      const [bx, by] = center(attemptedCell);
      markup += `<path class="tl-collision" d="M${bx - 8},${by - 8}L${bx + 8},${by + 8}M${bx + 8},${by - 8}L${bx - 8},${by + 8}"/>`;
    }
    const [px, py] = center(position);
    markup += `<circle class="tl-player-halo" cx="${px}" cy="${py}" r="17"/><circle class="tl-player" cx="${px}" cy="${py}" r="10"/><circle class="tl-player-core" cx="${px}" cy="${py}" r="3"/>`;
    svg.innerHTML = markup;
  }

  function renderCommands() {
    commandsElement.innerHTML = selectedRoute.map((action, index) => `<span class="tl-command${index < completedCommands ? ' tl-command-done' : ''}${index === completedCommands - 1 && attemptedCell ? ' tl-command-blocked' : ''}" aria-label="Command ${index + 1}: ${action}${index < completedCommands ? ', attempted' : ''}">${action}</span>`).join('');
  }

  function report(label, message, state = 'ready') {
    statusElement.dataset.state = state;
    statusLabel.textContent = label;
    statusText.textContent = message;
    const actionText = lastAction ? `Last command: ${lastAction}. ` : '';
    traceElement.textContent = `${actionText}Path: ${trajectory.map(([row, col]) => `(${row + 1}, ${col + 1})`).join(' → ')}. ${trajectory.length - 1} moves; ${completedCommands} commands attempted.`;
  }

  function reset(scenario = world.scenario) {
    cancel();
    world = createWorld(scenario);
    position = [...world.start];
    trajectory = [[...position]];
    selectedRoute = [...FIXED_ROUTE];
    completedCommands = 0;
    attemptedCell = null;
    lastAction = null;
    const current = SCENARIOS.find((item) => item.id === scenario);
    root.querySelectorAll('[data-scenario]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario)));
    root.querySelector('.tl-scenario-copy h4').textContent = current.label;
    root.querySelector('.tl-scenario-copy p').textContent = current.detail;
    const glyphs = { '-1,0': '↑', '0,1': '→', '1,0': '↓', '0,-1': '←' };
    const names = { '-1,0': 'north', '0,1': 'east', '1,0': 'south', '0,-1': 'west' };
    root.querySelector('.tl-mapping').innerHTML = COMMANDS.map((action) => `<span aria-label="Command ${action} moves ${names[KEY(world.actionVectors[action])]}"><b>${action}</b><i aria-hidden="true">${glyphs[KEY(world.actionVectors[action])]}</i></span>`).join('');
    routeNote.textContent = 'Stored route: E × 4, then N × 4.';
    renderGrid();
    renderCommands();
    report('READY', 'Try the stored route, then compare a route planned for this world. Coordinates are (row, column).');
  }

  function finish(result, method) {
    cancel();
    if (result === 'success') {
      report('GOAL REACHED', method === 'replan' ? 'The search planner used the current walls, controls, and goal to find a valid route.' : 'The stored sequence reaches the goal in the layout it was written for.', 'success');
    } else if (result === 'blocked') {
      report('ROUTE BLOCKED', world.scenario === 'controls' ? 'A familiar command now causes a different movement. The stored route hits a wall.' : 'The changed layout blocks a previously valid action sequence.', 'blocked');
    } else {
      report('GOAL MISSED', 'The route finishes at the old destination. Reaching a familiar location does not satisfy the new goal.', 'missed');
    }
  }

  function play(method) {
    reset();
    selectedRoute = method === 'replan' ? planRoute(world) : [...FIXED_ROUTE];
    if (!selectedRoute) {
      report('NO ROUTE', 'No valid route connects the player to this goal.', 'blocked');
      return;
    }
    routeNote.textContent = method === 'replan' ? `Breadth-first search: ${selectedRoute.length} commands under the current control mapping.` : 'Stored route: E × 4, then N × 4.';
    renderCommands();
    if (selectedRoute.length === 0) { finish('success', method); return; }
    runButtons.forEach((button) => { button.disabled = true; });
    const runGeneration = generation;
    const reducedMotion = Boolean(motionPreference?.matches);
    report('RUNNING', method === 'replan' ? 'Following the route computed for this world.' : 'Following the stored route without changing its commands.', 'running');

    function advance() {
      if (destroyed || generation !== runGeneration) return false;
      const action = selectedRoute[completedCommands];
      const result = stepWorld(world, position, action);
      lastAction = action;
      completedCommands += 1;
      if (result.blocked) attemptedCell = result.attempted;
      else { position = result.position; trajectory.push([...position]); }
      renderGrid();
      renderCommands();
      if (result.blocked) { finish('blocked', method); return false; }
      if (result.reached) { finish('success', method); return false; }
      if (completedCommands >= selectedRoute.length) { finish('missed', method); return false; }
      if (!reducedMotion) report('RUNNING', `Command ${action}: moved to ${COORD(position)}.`, 'running');
      return true;
    }

    if (reducedMotion) {
      while (advance()) { /* Complete immediately when reduced motion is requested. */ }
    } else {
      const tick = () => {
        timer = null;
        if (advance()) timer = win.setTimeout(tick, 380);
      };
      timer = win.setTimeout(tick, 240);
    }
  }

  function onClick(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.scenario) reset(button.dataset.scenario);
    else if (button.dataset.action === 'reset') reset();
    else if (button.dataset.action) play(button.dataset.action);
  }
  root.addEventListener('click', onClick);
  reset();
  return {
    destroy() {
      destroyed = true;
      cancel();
      root.removeEventListener('click', onClick);
    }
  };
}
