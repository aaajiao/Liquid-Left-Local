import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store';
import * as THREE from 'three';

describe('Game Store - Core State Management', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useGameStore.setState({
      currentLevel: 'PROLOGUE',
      interactionMode: 'SLINGSHOT',
      narrativeIndex: 0,
      nodes: [],
      connections: [],
      envFeatures: [],
      playerPos: new THREE.Vector3(0, 0.5, -12),
      cursorWorldPos: new THREE.Vector3(0, 0, 0),
      isMouseDown: false,
      hoveredNodeId: null,
      draggingNodeId: null,
      isInteractiveHover: false,
      sequenceOrder: [],
      nextSequenceIndex: 0,
      tetheredNodeId: null,
      bubblesPopped: 0,
      fragmentsCollected: 0,
      playerScale: 1,
      leafHealth: 0,
      lastBlockTime: 0,
      rainLevel: 0,
      isRaining: false,
      isHomeMelting: false,
      homeMeltProgress: 0,
      activeDialogue: null,
      dryConversationStage: 0,
      isLevelComplete: false
    });
  });

  describe('Level Initialization', () => {
    it('should initialize PROLOGUE level with correct state', () => {
      const state = useGameStore.getState();
      state.startLevel('PROLOGUE');

      const newState = useGameStore.getState();
      expect(newState.currentLevel).toBe('PROLOGUE');
      expect(newState.interactionMode).toBe('SLINGSHOT');
      expect(newState.playerPos.z).toBe(-12);
      expect(newState.isLevelComplete).toBe(false);
    });

    it('should initialize LANGUAGE level with correct nodes', () => {
      const state = useGameStore.getState();
      state.startLevel('LANGUAGE');

      const newState = useGameStore.getState();
      expect(newState.currentLevel).toBe('LANGUAGE');
      expect(newState.interactionMode).toBe('LURE');
      expect(newState.nodes.length).toBeGreaterThan(0);
      expect(newState.sequenceOrder.length).toBe(newState.nodes.length);
    });

    it('should reset level state when switching levels', () => {
      const state = useGameStore.getState();

      // Set some state in NAME level
      state.startLevel('NAME');
      state.popBubble('bubble-0');
      expect(useGameStore.getState().bubblesPopped).toBe(1);

      // Switch to WIND level
      state.startLevel('WIND');
      const newState = useGameStore.getState();

      // NAME-specific state should be reset
      expect(newState.bubblesPopped).toBe(0);
      expect(newState.currentLevel).toBe('WIND');
    });
  });

  describe('Player Position Management', () => {
    it('should update player position', () => {
      const newPos = new THREE.Vector3(5, 2, 10);
      useGameStore.getState().updatePlayerPos(newPos);

      const state = useGameStore.getState();
      expect(state.playerPos.x).toBe(5);
      expect(state.playerPos.y).toBe(2);
      expect(state.playerPos.z).toBe(10);
    });

    it('should maintain separate cursor and player positions', () => {
      const playerPos = new THREE.Vector3(1, 1, 1);
      const cursorPos = new THREE.Vector3(5, 0, 5);

      useGameStore.getState().updatePlayerPos(playerPos);
      useGameStore.getState().setCursorWorldPos(cursorPos);

      const state = useGameStore.getState();
      expect(state.playerPos.equals(playerPos)).toBe(true);
      expect(state.cursorWorldPos.equals(cursorPos)).toBe(true);
      expect(state.playerPos.equals(state.cursorWorldPos)).toBe(false);
    });
  });

  describe('Mouse Interaction', () => {
    it('should set mouse down state', () => {
      useGameStore.getState().setMouseDown(true);
      expect(useGameStore.getState().isMouseDown).toBe(true);
    });

    it('should advance narrative on first mouse down in PROLOGUE', () => {
      useGameStore.getState().startLevel('PROLOGUE');
      expect(useGameStore.getState().narrativeIndex).toBe(0);

      useGameStore.getState().setMouseDown(true);
      expect(useGameStore.getState().narrativeIndex).toBe(1);
    });

    it('should not advance narrative on subsequent mouse downs', () => {
      useGameStore.getState().startLevel('PROLOGUE');
      useGameStore.getState().setMouseDown(true);
      expect(useGameStore.getState().narrativeIndex).toBe(1);

      useGameStore.getState().setMouseDown(false);
      useGameStore.getState().setMouseDown(true);
      expect(useGameStore.getState().narrativeIndex).toBe(1);
    });
  });

  describe('NAME Level - Bubble & Fragment System', () => {
    beforeEach(() => {
      useGameStore.getState().startLevel('NAME');
    });

    it('should increment bubblesPopped when bubble is popped', () => {
      const state = useGameStore.getState();
      const initialBubbleCount = state.bubblesPopped;

      // Get first bubble from environment
      const bubble = state.envFeatures.find(f => f.type === 'BUBBLE');
      if (bubble) {
        state.popBubble(bubble.id);
        expect(useGameStore.getState().bubblesPopped).toBe(initialBubbleCount + 1);
      }
    });

    it('should create fragments when bubble is popped', () => {
      const state = useGameStore.getState();
      const bubble = state.envFeatures.find(f => f.type === 'BUBBLE');

      if (bubble) {
        const initialFeatureCount = state.envFeatures.length;
        state.popBubble(bubble.id);

        const newState = useGameStore.getState();
        // Should have removed 1 bubble and added 3 fragments
        expect(newState.envFeatures.length).toBe(initialFeatureCount + 2);

        const fragments = newState.envFeatures.filter(f => f.type === 'FRAGMENT');
        expect(fragments.length).toBeGreaterThan(0);
      }
    });

    it('should complete level when 5 fragments are collected', () => {
      const state = useGameStore.getState();

      // Collect 4 fragments - should not complete
      for (let i = 0; i < 4; i++) {
        state.absorbFragment(`frag-${i}`);
      }
      expect(useGameStore.getState().isLevelComplete).toBe(false);

      // Collect 5th fragment - should complete
      state.absorbFragment('frag-4');
      expect(useGameStore.getState().isLevelComplete).toBe(true);
    });
  });

  describe('CHEWING Level - Growth System', () => {
    beforeEach(() => {
      useGameStore.getState().startLevel('CHEWING');
    });

    it('should increase player scale when growing', () => {
      const initialScale = useGameStore.getState().playerScale;

      useGameStore.getState().growPlayer(2);
      expect(useGameStore.getState().playerScale).toBe(initialScale + 2);
    });

    it('should cap player scale at maximum value', () => {
      useGameStore.getState().growPlayer(100);
      expect(useGameStore.getState().playerScale).toBe(10);
    });

    it('should update narrative when player grows significantly', () => {
      const state = useGameStore.getState();
      expect(state.narrativeIndex).toBe(0);

      state.growPlayer(2.5); // Scale becomes 3.5
      expect(useGameStore.getState().narrativeIndex).toBe(2);
    });

    it('should complete level when player scale exceeds 8', () => {
      useGameStore.getState().growPlayer(8);
      expect(useGameStore.getState().isLevelComplete).toBe(true);
    });
  });

  describe('WIND Level - Leaf Health System', () => {
    beforeEach(() => {
      useGameStore.getState().startLevel('WIND');
    });

    it('should damage leaf health', () => {
      useGameStore.getState().leafHealth = 50;
      useGameStore.getState().damageLeaf(10);
      expect(useGameStore.getState().leafHealth).toBe(40);
    });

    it('should heal leaf health', () => {
      useGameStore.getState().leafHealth = 50;
      useGameStore.getState().healLeaf(20);
      expect(useGameStore.getState().leafHealth).toBe(70);
    });

    it('should not damage below 0', () => {
      useGameStore.getState().leafHealth = 5;
      useGameStore.getState().damageLeaf(10);
      expect(useGameStore.getState().leafHealth).toBe(0);
    });

    it('should not heal above 100', () => {
      useGameStore.getState().leafHealth = 95;
      useGameStore.getState().healLeaf(10);
      expect(useGameStore.getState().leafHealth).toBe(100);
    });

    it('should complete level when leaf health reaches 100', () => {
      useGameStore.getState().leafHealth = 99;
      useGameStore.getState().healLeaf(1);

      const state = useGameStore.getState();
      expect(state.leafHealth).toBe(100);
      expect(state.isLevelComplete).toBe(true);
      expect(state.narrativeIndex).toBe(2);
    });
  });

  describe('LANGUAGE Level - Connection System', () => {
    beforeEach(() => {
      useGameStore.getState().startLevel('LANGUAGE');
    });

    it('should create connection between two nodes', () => {
      const state = useGameStore.getState();
      const nodes = state.nodes;

      if (nodes.length >= 2) {
        const firstId = nodes[0].id;
        const secondId = nodes[1].id;

        // Start dragging from first node
        state.startDragConnection(firstId);
        expect(useGameStore.getState().draggingNodeId).toBe(firstId);

        // Complete connection to second node (if it's the correct sequence)
        if (state.sequenceOrder[0] === firstId && state.sequenceOrder[1] === secondId) {
          state.completeConnection(secondId);

          const newState = useGameStore.getState();
          expect(newState.connections.length).toBe(1);
          expect(newState.draggingNodeId).toBe(null);
        }
      }
    });

    it('should reject connection if not in correct sequence', () => {
      const state = useGameStore.getState();
      const nodes = state.nodes;

      if (nodes.length >= 3 && state.sequenceOrder.length >= 3) {
        const firstId = state.sequenceOrder[0];
        const thirdId = state.sequenceOrder[2]; // Skip second

        state.startDragConnection(firstId);
        state.completeConnection(thirdId);

        // Connection should be rejected
        expect(useGameStore.getState().connections.length).toBe(0);
      }
    });

    it('should complete level when all nodes are connected', () => {
      const state = useGameStore.getState();
      const sequence = state.sequenceOrder;

      // Connect all nodes in sequence
      for (let i = 0; i < sequence.length - 1; i++) {
        state.startDragConnection(sequence[i]);
        state.completeConnection(sequence[i + 1]);
      }

      const finalState = useGameStore.getState();
      expect(finalState.isLevelComplete).toBe(true);
    });
  });

  describe('TRAVEL Level - Vehicle Selection', () => {
    beforeEach(() => {
      useGameStore.getState().startLevel('TRAVEL');
    });

    it('should complete level when TEAR vehicle is selected', () => {
      useGameStore.getState().selectVehicle('TEAR');

      const state = useGameStore.getState();
      expect(state.isLevelComplete).toBe(true);
      expect(state.narrativeIndex).toBe(1);
    });

    it('should not complete level for other vehicles', () => {
      useGameStore.getState().selectVehicle('HAPPY');
      expect(useGameStore.getState().isLevelComplete).toBe(false);
    });
  });

  describe('Narrative System', () => {
    it('should advance narrative index', () => {
      useGameStore.getState().narrativeIndex = 0;
      useGameStore.getState().advanceNarrative();
      expect(useGameStore.getState().narrativeIndex).toBe(1);
    });

    it('should allow multiple narrative advances', () => {
      useGameStore.getState().narrativeIndex = 0;
      useGameStore.getState().advanceNarrative();
      useGameStore.getState().advanceNarrative();
      useGameStore.getState().advanceNarrative();
      expect(useGameStore.getState().narrativeIndex).toBe(3);
    });
  });
});
