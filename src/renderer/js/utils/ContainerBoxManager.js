// ContainerBoxManager - Manages container boxes and node containment
class ContainerBoxManager {
  static registry = new Map();

  static init(layoutEngine) {
    this.layoutEngine = layoutEngine;
  }

  static registerBox(id, nodeIds, margin = 40) {
    const key = String(id);
    if (!this.registry.has(key)) {
      this.registry.set(key, { nodeIds: Array.from(nodeIds), margin });
    } else {
      const entry = this.registry.get(key);
      entry.nodeIds = Array.from(nodeIds);
      entry.margin = margin;
    }
  }

  static setBoxBounds(id, bounds) {
    const key = String(id);
    const entry = this.registry.get(key);
    if (!entry) {
      console.warn(`[ContainerBoxManager] setBoxBounds: Box ${id} not registered`);
      return false;
    }
    entry.bounds = { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };
    return true;
  }

  static enforceBox(id, bounds) {
    const key = String(id);
    const entry = this.registry.get(key);
    if (!entry) return false;
    const { nodeIds, margin } = entry;
    const { minX, minY, maxX, maxY } = bounds;

    if (this.layoutEngine && typeof this.layoutEngine.enforceBoundsForNodes === 'function') {
      this.layoutEngine.enforceBoundsForNodes(nodeIds, { minX, minY, maxX, maxY, margin: margin ?? 40 });
    }
    return true;
  }

  static enforceAll() {
    if (!this.registry || this.registry.size === 0) return;

    for (const [boxId, entry] of this.registry.entries()) {
      const { nodeIds, margin = 40, bounds } = entry;

      let minX, minY, maxX, maxY;
      if (bounds) {
        ({ minX, minY, maxX, maxY } = bounds);
      } else {
        const positions = nodeIds.map(id => this.layoutEngine.getNodePos(id)).filter(p => !!p);
        if (!positions.length) continue;
        const xs = positions.map(p => p.x);
        const ys = positions.map(p => p.y);
        minX = Math.min(...xs) - margin;
        maxX = Math.max(...xs) + margin;
        minY = Math.min(...ys) - margin;
        maxY = Math.max(...ys) + margin;
      }

      if (this.layoutEngine && typeof this.layoutEngine.enforceBoundsForNodes === 'function') {
        this.layoutEngine.enforceBoundsForNodes(nodeIds, { minX, minY, maxX, maxY, margin });
      }
    }
  }

  static createUserBox(boxId, initialBounds = null, margin = 40) {
    const key = String(boxId);
    if (!this.registry.has(key)) {
      this.registry.set(key, {
        nodeIds: [],
        margin,
        bounds: initialBounds ? {
          minX: initialBounds.minX,
          minY: initialBounds.minY,
          maxX: initialBounds.maxX,
          maxY: initialBounds.maxY
        } : null,
        isUserBox: true
      });
      console.log(`[ContainerBoxManager] Created user box: ${boxId}`);
      return true;
    }
    return false;
  }

  static addNodesToBox(boxId, nodeIds) {
    const key = String(boxId);
    const entry = this.registry.get(key);
    if (!entry) {
      console.warn(`[ContainerBoxManager] Box ${boxId} not found`);
      return false;
    }
    entry.nodeIds = [...new Set([...entry.nodeIds, ...nodeIds])];
    console.log(`[ContainerBoxManager] Added nodes to box ${boxId}:`, nodeIds);
    return true;
  }

  static removeNodesFromBox(boxId, nodeIds) {
    const key = String(boxId);
    const entry = this.registry.get(key);
    if (!entry) return false;
    entry.nodeIds = entry.nodeIds.filter(id => !nodeIds.includes(id));
    console.log(`[ContainerBoxManager] Removed nodes from box ${boxId}:`, nodeIds);
    return true;
  }

  static deleteUserBox(boxId) {
    const key = String(boxId);
    const entry = this.registry.get(key);
    if (!entry || !entry.isUserBox) return false;
    this.registry.delete(key);
    console.log(`[ContainerBoxManager] Deleted user box: ${boxId}`);
    return true;
  }

  static getUserBoxes() {
    const userBoxes = [];
    for (const [boxId, entry] of this.registry.entries()) {
      if (entry.isUserBox) {
        userBoxes.push({
          id: boxId,
          nodeIds: [...entry.nodeIds],
          bounds: entry.bounds ? {...entry.bounds} : null,
          margin: entry.margin
        });
      }
    }
    return userBoxes;
  }
}

export default ContainerBoxManager;
