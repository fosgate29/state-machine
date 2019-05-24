import expectThrow from './helpers/expectThrow';

const StateMachineMock = artifacts.require('StateMachineMock');

contract('StateMachine', accounts => {
  let stateMachine;
  const invalidState = web3.utils.padRight(web3.utils.fromAscii('invalid'), 34);
  const zeroState = web3.utils.padRight(web3.utils.fromAscii(0), 34);;
  const state0 = web3.utils.padRight(web3.utils.fromAscii('STATE0'), 34);
  const state1 = web3.utils.padRight(web3.utils.fromAscii('STATE1'), 34);
  const state2 = web3.utils.padRight(web3.utils.fromAscii('STATE2'), 34);
  const state3 = web3.utils.padRight(web3.utils.fromAscii('STATE3'), 34);
  let dummyFunctionSelector;


  beforeEach(async () => {
    stateMachine = await StateMachineMock.new();
    await stateMachine.setStatesHelper([state0, state1, state2, state3]);
    dummyFunctionSelector = await stateMachine.dummyFunctionSelector.call();
  });

  it('should not be possible to set states if they\'ve already been set', async () => {
    await expectThrow(stateMachine.setStatesHelper([invalidState]));
  });

  it('should not be possible to use an empty array to set the states', async () => {
    stateMachine = await StateMachineMock.new();
    await expectThrow(stateMachine.setStatesHelper([]));
  });

  it('should not be possible to set duplicated states', async () => {
    stateMachine = await StateMachineMock.new();
    await expectThrow(stateMachine.setStatesHelper([state0, state1, state0, state3]));
    await expectThrow(stateMachine.setStatesHelper([state0, state1, state1, state3]));
    await expectThrow(stateMachine.setStatesHelper([state0, state0, state0, state0]));
    await expectThrow(stateMachine.setStatesHelper([state0, state1, state2, state0]));
  });

  it('should not be possible to set states if the initial stateId is 0', async () => {
    stateMachine = await StateMachineMock.new();
    await expectThrow(stateMachine.setStatesHelper([zeroState, state0, state1]));
  });

  it('should not be possible to set the states if any later stateId is 0', async () => {
    stateMachine = await StateMachineMock.new();
    await expectThrow(stateMachine.setStatesHelper([state1, state2, zeroState, state3]));
    //no states should now be set, so the current stateId should not have been set
    let currentState;
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.utils.padRight(web3.utils.fromAscii(currentState), 34), zeroState);
  });

  it('should be possible to allow a function', async () => {
    await stateMachine.allowFunctionHelper(state0, dummyFunctionSelector);
    await stateMachine.allowFunctionHelper(state1, dummyFunctionSelector);
    await stateMachine.allowFunctionHelper(state2, dummyFunctionSelector);
    await stateMachine.allowFunctionHelper(state3, dummyFunctionSelector);
  });

  it('should not be possible to call an unallowed function', async () => {
    await expectThrow(stateMachine.dummyFunction());
  });

  it('should be possible to call an allowed function', async () => {
    await stateMachine.allowFunctionHelper(state0, dummyFunctionSelector);
    await stateMachine.dummyFunction();
  });

  // TODO: review this.. it improves coverage but it doesn't seem necessary
  it('should not perform conditional transitions at any state', async () => {
    let currentState;
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state0);

    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state0);

    await stateMachine.goToNextStateHelper();
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state1);

    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state1);

    await stateMachine.goToNextStateHelper();
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state2);

    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state2);

    await stateMachine.goToNextStateHelper();
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state3);

    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state3);
  });

  it('should automatically go to a state with a condition that evaluates to true', async () => {
    let currentState;
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state0);

    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state0);

    await stateMachine.setDummyCondition(state1);
    await stateMachine.conditionalTransitions();
    
    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state1);

    await stateMachine.setDummyVariableCondition(state2);
    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state1);

    await stateMachine.setCondition(true);
    await stateMachine.conditionalTransitions();

    currentState = await stateMachine.getCurrentStateId.call();
    assert.equal(web3.toUtf8(currentState), state2);
  });

  it('should be possible to set a callback for a state', async () => {
    let callbackCalled;
    callbackCalled = await stateMachine.callbackCalled.call();
    assert.isFalse(callbackCalled);

    await stateMachine.setDummyCallback(state1);
    callbackCalled = await stateMachine.callbackCalled.call();
    assert.isFalse(callbackCalled);

    await stateMachine.goToNextStateHelper();
    callbackCalled = await stateMachine.callbackCalled.call();
    assert.isTrue(callbackCalled);
  });

  it('should not be possible to go to next state when in the last state', async () => {
    // Go to state 1
    await stateMachine.goToNextStateHelper();
    // Go to state 2
    await stateMachine.goToNextStateHelper();
    // Go to state 3
    await stateMachine.goToNextStateHelper();
    // Should throw because state 3 is the last state
    await expectThrow(stateMachine.goToNextStateHelper());
  });

});
