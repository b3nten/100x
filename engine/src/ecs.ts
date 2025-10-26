import { constructorOf, make } from "./lib.ts";
import { assert } from "./asserts.ts";
import { logger, warnOnce } from "./logging.ts";
import type { ConstructorOf, InstanceOf } from "./types.ts";
import { isConstructor, isFunction } from "./checks.ts";
import { AutoMap, SparseSet } from "./structures.ts";
import {
  createEvent,
  EventManager,
  type EventData,
  type EventType,
} from "./events.ts";
import { AssetLoader } from "./assets.ts";

// ███████╗███╗   ██╗████████╗██╗████████╗██╗███████╗███████╗
// ██╔════╝████╗  ██║╚══██╔══╝██║╚══██╔══╝██║██╔════╝██╔════╝
// █████╗  ██╔██╗ ██║   ██║   ██║   ██║   ██║█████╗  ███████╗
// ██╔══╝  ██║╚██╗██║   ██║   ██║   ██║   ██║██╔══╝  ╚════██║
// ███████╗██║ ╚████║   ██║   ██║   ██║   ██║███████╗███████║
// ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝   ╚═╝   ╚═╝╚══════╝╚══════╝

/** Entity IDs are unique integers that identify entities in the world. */
export type EntityID = number & { entity: true };

export class EntityDoesNotExistError extends Error {
  constructor() {
    super("Entity does not exist.");
  }
}

export let entityDoesNotExistError = new EntityDoesNotExistError();

/**
 * Represents a data structure that can be attached to an entity that is indexed by its constructor.
 * Entities can only have one instance of each component.
 * @example
 * class Position2D implements Component {
 *   constructor(public x: number, public y: number) {}
 * }
 */
export type Component = Object;

// ████████╗ █████╗  ██████╗ ███████╗
// ╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝
//    ██║   ███████║██║  ███╗███████╗
//    ██║   ██╔══██║██║   ██║╚════██║
//    ██║   ██║  ██║╚██████╔╝███████║
//    ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝

/**
 * Tags are used to group components of different types.
 * They can be assigned to the static property `ecsTags` on a component class.
 * Either as a single tag or array of tags.
 */
export type Tag = symbol;

/**
 * Get the tags associated with a component or component constructor.
 * @param component
 * @returns An array of tags.
 */
export function tagsOf(
  component: Component | ConstructorOf<Component>,
): Tag | Array<Tag> | undefined {
  const ctor = isConstructor(component) ? component : constructorOf(component);
  if (!("ecsTags" in ctor)) {
    return;
  }
  return (ctor as any).ecsTags;
}

export class TagSet {
  set: AutoMap<ConstructorOf<Component>, SparseSet<Component>> = new AutoMap(
    () => new SparseSet(),
  );

  add = (entity: EntityID, component: Component) => {
    void this.set.get(constructorOf(component)).add(entity, component);
  };

  remove = (entity: EntityID, componentConstructor: ConstructorOf<Component>) =>
    void this.set.get(componentConstructor).remove(entity);

  get = (entity: EntityID, componentConstructor: ConstructorOf<Component>) =>
    this.set.get(componentConstructor).get(entity);

  /**
   * Iterate through all components
   */
  *[Symbol.iterator](): Iterator<[entity: EntityID, component: Component]> {
    for (let ss of this.set.values()) {
      for (let value of ss) {
        yield value as [entity: EntityID, component: Component];
      }
    }
  }

  /**
   * Iterate through all components attached to entity
   */
  // todo: optimize data structures for this usecase
  *entityIter(entity: EntityID): Iterator<Component> {
    let val: Component | undefined;
    for (let ss of this.set.values()) {
      if ((val = ss.get(entity))) {
        yield val;
      }
    }
  }
}

// ██████╗ ██████╗ ███████╗███████╗ █████╗ ██████╗
// ██╔══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗██╔══██╗
// ██████╔╝██████╔╝█████╗  █████╗  ███████║██████╔╝
// ██╔═══╝ ██╔══██╗██╔══╝  ██╔══╝  ██╔══██║██╔══██╗
// ██║     ██║  ██║███████╗██║     ██║  ██║██████╔╝
// ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═════╝

/**
 * Prefabs are a convention for functions that take in a World and return an entity.
 * This makes it easy to bundle components together and store them in an eaisally consumable format.
 */
export type Prefab = (world: World) => EntityID;

/**
 * Helper function to define a {@link Prefab}.
 * @param prefab
 * @returns
 */
export const createPrefab = (prefab: Prefab) => prefab;

// ██████╗ ███████╗██╗      █████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗██╗  ██╗██╗██████╗
// ██╔══██╗██╔════╝██║     ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝██║  ██║██║██╔══██╗
// ██████╔╝█████╗  ██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║███████╗███████║██║██████╔╝
// ██╔══██╗██╔══╝  ██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║██╔══██║██║██╔═══╝
// ██║  ██║███████╗███████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║███████║██║  ██║██║██║
// ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝

type ChildSet = Omit<Set<EntityID>, "add" | "delete" | "clear">;

let EMPTY_SET: Set<any> = new Set();

export class CircularRelationshipError extends Error {
  constructor() {
    super("Circular relationship detected");
  }
}

export const circularRelationshipError = new CircularRelationshipError();

export class Relationship implements Component {
  /**
   * Parent a child entity to a parent entity.
   * @param world - the {@link World} with the parent and child entities
   * @param parent - the parent {@link EntityID}
   * @param child - the child {@link EntityID}
   * @returns void on success, Error otherwise
   */
  static Parent(
    world: World,
    parent: EntityID,
    child: EntityID,
  ): undefined | Error {
    if (!world.entityExists(parent) || !world.entityExists(child)) {
      ELYSIA_DEV: logger.error("Cannot parent: entity does not exist");
      return entityDoesNotExistError;
    }
    let parentRelationship = world.getComponent(parent, Relationship);
    if (!parentRelationship) {
      parentRelationship = new Relationship();
      world.addComponent(parent, parentRelationship);
    } else {
      // check for circular relationships
      let currentParent: EntityID | null = parent;
      while (currentParent) {
        if (currentParent === child) {
          ELYSIA_DEV: logger.error(
            "Detected a circular relationship while parenting",
          );
          return circularRelationshipError;
        }
        const currentRelationship: Relationship | null = world.getComponent(
          currentParent,
          Relationship,
        );
        currentParent = currentRelationship?._parent ?? null;
      }
    }

    let childRelationship = world.getComponent(child, Relationship);
    if (!childRelationship) {
      childRelationship = new Relationship();
      world.addComponent(child, childRelationship);
    }

    let oldParent = childRelationship._parent;
    if (oldParent) {
      Relationship.Unparent(world, oldParent, child);
    }

    parentRelationship._children ??= new Set<EntityID>();
    parentRelationship._children.add(child);
    childRelationship._parent = parent;
  }

  /**
   * Unparent a child entity from a parent entity.
   * @param world - the {@link World} with the parent and child entities
   * @param parent - the parent {@link EntityID}
   * @param child - the child {@link EntityID}
   * @returns void on success, Error otherwise
   */
  static Unparent(
    world: World,
    parent: EntityID,
    child: EntityID,
  ): undefined | Error {
    if (!world.entityExists(parent) || !world.entityExists(child)) {
      ELYSIA_DEV: logger.error("Cannot parent: entity does not exist");
      return entityDoesNotExistError;
    }
    let childRelationship = world.getComponent(child, Relationship);
    if (!childRelationship) {
      return;
    }
    let parentRelationship = world.getComponent(parent, Relationship);
    if (!parentRelationship) {
      return;
    }
    if (childRelationship.parent === parent) {
      childRelationship._parent = null;
    }
    parentRelationship._children?.delete(child);
  }

  /** Get the parent {@link EntityID} */
  get parent(): EntityID | null {
    return this._parent;
  }

  /** Get a readonly Set with {@link EntityID}s of child entities */
  get children(): ChildSet {
    return this._children ?? <ChildSet>EMPTY_SET;
  }

  protected _parent: EntityID | null = null;
  protected _children?: Set<EntityID>;
}

// ██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗
// ██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
// ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
// ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
// ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
//  ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝

declare global {
  var ELYSIA_CURRENT_WORLD: World | undefined;
}

type MapToInstances<T extends readonly ConstructorOf<Component>[]> = {
  [K in keyof T]: T[K] extends ConstructorOf<infer U> ? U : never;
};

const ecsInternal = Symbol("ecsInternal");

export class World {
  /** The number of entities in the world. */
  get entityCount() {
    return this[ecsInternal].entities.size;
  }

  /**
   * Add a system instance to the world.
   * @param system - the System constructor
   * @param args - the arguments to pass to the System constructor
   */
  addSystem = <Args extends any[], T extends ConstructorOf<System, Args>>(
    system: T,
    ...args: Args
  ) => {
    globalThis.ELYSIA_CURRENT_WORLD = this;
    let instance = make(system, ...args);
    globalThis.ELYSIA_CURRENT_WORLD = undefined;
    this[ecsInternal].systems.add(instance);
    this[ecsInternal].systemsIndexedByType.set(system, instance);
    if (this[ecsInternal].active) {
      instance.__runStartup?.();
    }
  };

  /**
   * Get a system instance by its constructor, or null if not found.
   * @param system - constructor of desired system instance
   * @returns system or null if not found
   */
  getSystem = <T extends ConstructorOf<System>>(
    system: T,
  ): InstanceType<T> | null => {
    if (this[ecsInternal].systemsIndexedByType.has(system)) {
      return this[ecsInternal].systemsIndexedByType.get(
        system,
      ) as InstanceType<T>;
    }
    for (const registeredSystem of this[ecsInternal].systems) {
      if (registeredSystem instanceof system) {
        return registeredSystem as InstanceType<T>;
      }
    }
    return null;
  };

  /**
   * Remove a system instance from the world.
   * @param system - constructor of desired system instance
   */
  removeSystem = <T extends ConstructorOf<System>>(
    system: T,
  ): InstanceType<T> | null => {
    if (this[ecsInternal].systemsIndexedByType.has(system)) {
      const instance = this[ecsInternal].systemsIndexedByType.get(system);
      if (instance) {
        this[ecsInternal].systems.delete(instance);
        this[ecsInternal].systemsIndexedByType.delete(system);
        instance.shutdown?.();
        return instance as InstanceType<T>;
      }
    }
    return null;
  };

  /**
   * Startup all systems in the world.
   */
  startup = () => {
    if (this[ecsInternal].active) {
      ELYSIA_DEV: logger.error(
        "Attempted to startup a world that has already been started. This is a noop.",
      );
      return;
    }
    this[ecsInternal].active = true;
    let prev = globalThis.ELYSIA_CURRENT_WORLD;
    globalThis.ELYSIA_CURRENT_WORLD = this;
    for (const system of this[ecsInternal].systems) {
      system.__runStartup?.();
    }
    globalThis.ELYSIA_CURRENT_WORLD = prev;
  };

  /**
   * Update all systems in the world.
   * @param frametime - The time elapsed since the last update.
   */
  update = (frametime: number) => {
    if (!this[ecsInternal].active) {
      ELYSIA_DEV: logger.error(
        "Attempted to update a world that has not been started. This is a noop.",
      );
      return;
    }
    let prev = globalThis.ELYSIA_CURRENT_WORLD;
    globalThis.ELYSIA_CURRENT_WORLD = this;
    for (const system of this[ecsInternal].systems) {
      system.__runUpdate?.(frametime);
    }
    globalThis.ELYSIA_CURRENT_WORLD = prev;
  };

  /**
   * Shutdown all systems in the world.
   */
  shutdown = () => {
    if (!this[ecsInternal].active) {
      ELYSIA_DEV: logger.error(
        "Attempted to shutdown a world that has not been started. This is a noop.",
      );
      return;
    }
    this[ecsInternal].active = false;
    let prev = globalThis.ELYSIA_CURRENT_WORLD;
    globalThis.ELYSIA_CURRENT_WORLD = this;
    for (const system of this[ecsInternal].systems) {
      system.__runShutdown?.();
    }
    globalThis.ELYSIA_CURRENT_WORLD = prev;
  };

  /**
   * Create an entity with components.
   * @param components Components to be added to the entity.
   */
  createEntityWith = (...components: Array<Component>) => {
    let entity = this.createEntity();
    for (let c of components) {
      this.addComponent(entity, c);
    }
    return entity;
  };

  /**
   * Create a new entity in the world.
   * @returns The ID of the newly created entity.
   */
  createEntity = (): EntityID => {
    const entity = <EntityID>this[ecsInternal].nextEntityId++;
    this[ecsInternal].entities.add(entity);
    for (const callback of this[ecsInternal].onEntityCreatedCallbacks) {
      callback(this, entity);
    }
    return entity;
  };

  /**
   * Remove an entity from the world, recursively removing child entities.
   * @param entity - The ID of the entity to remove.
   * @returns void on success, Error otherwise
   */
  removeEntity = (entity: EntityID): undefined | Error => {
    if (!this.entityExists(entity)) {
      ELYSIA_DEV: logger.error(entityDoesNotExistError);
      return entityDoesNotExistError;
    }
    let relationship = this.getComponent(entity, Relationship);
    if (relationship) {
      // unparent from parent
      if (relationship.parent) {
        this.unparent(relationship.parent, entity);
      }
      // recursively remove child entities
      for (let childEntity of relationship?.children) {
        this.removeEntity(childEntity);
      }
    }
    // callbacks
    for (const callback of this[ecsInternal].onEntityRemovedCallbacks) {
      callback(this, entity);
    }
    // remove each component
    for (const componentConstructor of this[ecsInternal].componentMap.keys()) {
      this.removeComponent(entity, componentConstructor);
    }
    this[ecsInternal].entities.delete(entity);
  };

  /** Checks if {@link EntityID} exists in the world */
  entityExists = (entity: EntityID) => this[ecsInternal].entities.has(entity);

  /**
   * Add a component to an entity.
   * If a component already exists of the same type, it will be removed.
   * @param entity - The ID of the entity to add the component to.
   * @param component - The component to add.
   * @returns void on success, Error otherwise
   */
  addComponent = (
    entity: EntityID,
    component: Component | ConstructorOf<Component>,
  ): undefined | Error => {
    // invalid entity
    if (!this.entityExists(entity)) {
      ELYSIA_DEV: logger.error(entityDoesNotExistError);
      return entityDoesNotExistError;
    }

    if (isConstructor(component)) {
      component = make(component);
    }

    // remove same component if exists
    if (this.hasComponent(entity, constructorOf(component))) {
      this.removeComponent(entity, constructorOf(component));
    }

    // add to component map
    this[ecsInternal].componentMap
      .get(constructorOf(component))
      .add(entity, component);

    // run callbacks for component
    for (const callback of this[ecsInternal].onComponentAddedCallbacks.get(
      constructorOf(component),
    )) {
      callback(this, entity, component);
    }

    // handle tags
    let tags = tagsOf(component);
    if (tags) {
      if (Array.isArray(tags)) {
        for (const t of tags) {
          // add to tagmap
          this[ecsInternal].tagMap.get(t).add(entity, component);
          // call callbacks
          for (const callback of this[
            ecsInternal
          ].onComponentWithTagAddedCallbacks.get(t)) {
            callback(this, entity, component);
          }
        }
      } else {
        // add to tagmap
        this[ecsInternal].tagMap.get(tags).add(entity, component);
        // call callbacks
        for (const callback of this[
          ecsInternal
        ].onComponentWithTagAddedCallbacks.get(tags)) {
          callback(this, entity, component);
        }
      }
    }
  };

  addComponents = (
    entity: EntityID,
    ...components: Component[]
  ): undefined | Error => {
    for (let component of components) {
      let err = this.addComponent(entity, component);
      if (err) return err;
    }
  };

  /**
   * Add a prefab to the world.
   * @param prefab {@link Prefab}
   * @returns
   */
  addPrefab = (prefab: Prefab) => prefab(this);

  /**
   * Add multiple prefabs to the world.
   * @param prefabs
   */
  addPrefabs = (...prefabs: Prefab[]) => {
    for (let prefab of prefabs) {
      prefab(this);
    }
  };

  /**
   * Get a component on an Entity.
   * @param entity - The ID of the entity to get the component from.
   * @param componentConstructor - The component to get.
   * @returns The component, or null if it doesn't exist.
   */
  getComponent<T extends Component>(
    entity: EntityID,
    componentConstructor: ConstructorOf<T>,
  ): T | null {
    return (
      <T>this[ecsInternal].componentMap.get(componentConstructor).get(entity) ??
      null
    );
  }

  /**
   * Get a component instance from the world, if it exists.
   * Useful for components that should only have one instance in the world.
   * @param componentConstructor
   * @returns
   */
  resolveComponent<T extends Component>(
    componentConstructor: ConstructorOf<T>,
  ): T | null {
    ELYSIA_DEV: {
      let size = this[ecsInternal].componentMap.get(componentConstructor).size;
      if (size > 1) {
        warnOnce(
          `resolveComponent(${componentConstructor.name}) found ${size} instances. Is this component meant to exist multiple times in the world?`,
        );
      }
    }
    return (
      <T>this[ecsInternal].componentMap.get(componentConstructor).first ?? null
    );
  }

  /**
   * Remove a component from an entity.
   * @param entity - The ID of the entity to remove the component from.
   * @param componentConstructor - The component to remove.
   * @returns void on success, Error otherwise
   */
  removeComponent = (
    entity: EntityID,
    componentConstructor: ConstructorOf<Component>,
  ): undefined | Error => {
    // invalid entity
    if (!this.entityExists(entity)) {
      ELYSIA_DEV: logger.error(entityDoesNotExistError);
      return entityDoesNotExistError;
    }

    // component not on entity
    // benton: might consider returning an error here
    if (!this.hasComponent(entity, componentConstructor)) {
      return;
    }

    const removedComponent = this.getComponent(entity, componentConstructor)!;

    // remove from component map
    this[ecsInternal].componentMap.get(componentConstructor).remove(entity);

    // run callbacks
    for (const callback of this[ecsInternal].onComponentRemovedCallbacks.get(
      componentConstructor,
    )) {
      callback(this, entity, componentConstructor);
    }

    // handle tags
    let tags = tagsOf(componentConstructor);
    if (tags) {
      if (Array.isArray(tags)) {
        for (const t of tags) {
          // remove
          this[ecsInternal].tagMap.get(t).remove(entity, componentConstructor);
          // callbacks
          for (const callback of this[
            ecsInternal
          ].onComponentWithTagRemovedCallbacks.get(t)) {
            callback(this, entity, componentConstructor);
          }
        }
      } else {
        // remove
        this[ecsInternal].tagMap.get(tags).remove(entity, componentConstructor);
        // callbacks
        for (const callback of this[
          ecsInternal
        ].onComponentWithTagRemovedCallbacks.get(tags)) {
          callback(this, entity, componentConstructor);
        }
      }
    }
  };

  /**
   * Check if an entity has a component.
   * @param entity - The ID of the entity to check.
   * @param component - The component to check for.
   * @returns True if the entity has the component, false otherwise.
   */
  hasComponent = (
    entity: EntityID,
    component: ConstructorOf<Component>,
  ): boolean => {
    return this[ecsInternal].componentMap.get(component).has(entity);
  };

  /**
   * Creates an iterator that yields entities with the specified components.
   *
   * The returned touple is reused between iterations, either destructure or shallow copy it.
   * @param components - Component constructors
   * @returns An iterator that yields entities with the specified components.
   * @example
   * for (const [entity, position, velocity] of world.componentIter(Position, Velocity)) {
   *   // ...
   * }
   */
  *entitiesWith<T extends readonly ConstructorOf<Component>[]>(
    ...components: T
  ): IterableIterator<[entity: EntityID, ...components: MapToInstances<T>]> {
    if (components.length === 0) return;
    // find smallest
    let smallest = this[ecsInternal].componentMap.get(components[0]);
    for (let i = 1; i < components.length; i++) {
      const set = this[ecsInternal].componentMap.get(components[i]);
      if (set.size === 0) return;
      if (set.size < smallest.size) {
        smallest = set;
      }
    }

    // prevent leaking a previous iterator result with extra components
    this.sharedComponentIterResult.length = smallest.size;

    outer: for (const [entity] of smallest) {
      this.sharedComponentIterResult[0] = entity;
      for (let i = 0; i < components.length; i++) {
        this.sharedComponentIterResult[i + 1] = this[ecsInternal].componentMap
          .get(components[i])
          .get(entity);
        // move on if component is missing
        if (!this.sharedComponentIterResult[i + 1]) continue outer;
      }
      yield this.sharedComponentIterResult as any;
    }
  }

  /**
   * Creates an iterator that yields entities with the specified components.
   *
   * The returned touple is reused between iterations, either destructure or shallow copy it.
   * @param components - Component constructors
   * @returns An iterator that yields entities with the specified components.
   * @example
   * for (const [entity, position, velocity] of world.componentIter(Position, Velocity)) {
   *   // ...
   * }
   */
  entitiesWithTag(
    tag: Tag,
  ): Iterable<[entity: EntityID, component: Component]> {
    // casting as iterator returns number for EntityID
    return <Iterable<[entity: EntityID, component: Component]>>(
      this[ecsInternal].tagMap.get(tag)
    );
  }

  /**
   * Iterate all components of an entity with the provided tag.
   * @param entity - the entity to iterate over tagged components
   * @param tag - the tag to iterate over
   */
  componentsWithTag = (entity: EntityID, tag: Tag) => {
    return <IterableIterator<Component>>(
      this[ecsInternal].tagMap.get(tag).entityIter(entity)
    );
  };

  /**
   * Parent a child entity to a parent entity.
   * @param parent - the parent {@link EntityID}
   * @param child - the child {@link EntityID}
   */
  parent = (parent: EntityID, child: EntityID) =>
    Relationship.Parent(this, parent, child);

  /**
   * Unparent a child entity from a parent entity.
   * @param parent - the parent {@link EntityID}
   * @param child - the child {@link EntityID}
   */
  unparent = (parent: EntityID, child: EntityID) =>
    Relationship.Unparent(this, parent, child);

  /**
   * Register a callback to run when entities are created.
   * @param callback - called when an entity is created
   * @returns a function that removes the callback
   */
  onEntityCreated = (callback: (world: World, entity: EntityID) => void) => {
    this[ecsInternal].onEntityCreatedCallbacks.add(callback);
    return () => {
      this[ecsInternal].onEntityCreatedCallbacks.delete(callback);
    };
  };

  /**
   * Register a callback to run when entities are removed.
   * @param callback - called when an entity is removed
   * @returns a function that removes the callback
   */
  onEntityRemoved = (callback: (world: World, entity: EntityID) => void) => {
    this[ecsInternal].onEntityRemovedCallbacks.add(callback);
    return () => {
      this[ecsInternal].onEntityRemovedCallbacks.delete(callback);
    };
  };

  /**
   * Register a callback to run when components are added to entities.
   * @returns a function that removes the callback
   */
  onComponentAdded = <T extends Component>(
    component: ConstructorOf<T>,
    callback: (world: World, entity: EntityID, component: T) => void,
  ) => {
    this[ecsInternal].onComponentAddedCallbacks.get(component).add(callback);
    return () => {
      this[ecsInternal].onComponentAddedCallbacks
        .get(component)
        .delete(callback);
    };
  };

  /**
   * Register a callback to run when components are removed from entities.
   * @returns a function that removes the callback
   */
  onComponentRemoved = <T extends Component>(
    component: ConstructorOf<T>,
    callback: (world: World, entity: EntityID, component: T) => void,
  ) => {
    this[ecsInternal].onComponentRemovedCallbacks.get(component).add(callback);
    return () => {
      this[ecsInternal].onComponentRemovedCallbacks
        .get(component)
        .delete(callback);
    };
  };

  /**
   * Register a callback to run when components with a specific tag are added to entities.
   * @returns a function that removes the callback
   */
  onComponentWithTagAdded = (
    tag: Tag,
    callback: (world: World, entity: EntityID, component: Component) => void,
  ) => {
    this[ecsInternal].onComponentWithTagAddedCallbacks.get(tag).add(callback);
    return () => {
      this[ecsInternal].onComponentWithTagAddedCallbacks
        .get(tag)
        .delete(callback);
    };
  };

  /**
   * Register a callback to run when components with a specific tag are removed from entities.
   * @returns a function that removes the callback
   */
  onComponentWithTagRemoved = (
    tag: Tag,
    callback: (world: World, entity: EntityID, component: Component) => void,
  ) => {
    this[ecsInternal].onComponentWithTagRemovedCallbacks.get(tag).add(callback);
    return () => {
      this[ecsInternal].onComponentWithTagRemovedCallbacks
        .get(tag)
        .delete(callback);
    };
  };

  [ecsInternal] = new WorldInternals(this);

  sendEvent = this[ecsInternal].events.notify;
  receiveEvent = this[ecsInternal].events.register;

  // used in componentIter
  private sharedComponentIterResult: any[] = [];
}

class WorldInternals {
  constructor(public world: World) {}

  active = false;

  systems: Set<InstanceOf<typeof System>> = new Set();

  systemsIndexedByType: Map<ConstructorOf<System>, InstanceOf<typeof System>> =
    new Map();

  nextEntityId = 1;

  entities: Set<EntityID> = new Set();

  componentMap: AutoMap<ConstructorOf<Component>, SparseSet<Component>> =
    new AutoMap(() => new SparseSet());

  tagMap: AutoMap<Tag, TagSet> = new AutoMap(() => new TagSet());

  onEntityCreatedCallbacks: Set<(world: World, entity: EntityID) => void> =
    new Set();

  onEntityRemovedCallbacks: Set<(world: World, entity: EntityID) => void> =
    new Set();

  onComponentAddedCallbacks: AutoMap<
    ConstructorOf<Component>,
    Set<(world: World, entity: EntityID, component: any) => void>
  > = new AutoMap(() => new Set());

  onComponentRemovedCallbacks: AutoMap<
    ConstructorOf<Component>,
    Set<(world: World, entity: EntityID, component: any) => void>
  > = new AutoMap(() => new Set());

  onComponentWithTagAddedCallbacks: AutoMap<
    Tag,
    Set<(world: World, entity: EntityID, component: any) => void>
  > = new AutoMap(() => new Set());

  onComponentWithTagRemovedCallbacks: AutoMap<
    Tag,
    Set<(world: World, entity: EntityID, component: any) => void>
  > = new AutoMap(() => new Set());

  events = new EventManager();
}

// ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗
// ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║
// ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║
// ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║
// ███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║
// ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝

/**
 * ECS Systems contain the logic for the world. They can create and remove entities,
 * query for entities with a specific type or types of Components, add and remove Components,
 * and run logic on the entities.
 */
export abstract class System {
  /** The world this system is attached to. */
  readonly world: World = globalThis.ELYSIA_CURRENT_WORLD!;

  /** Called when the system begins it's lifecycle in the world. */
  startup?(): void;

  /** Called when the world updates. */
  update?(frametime: number): void;

  /** Called when the system is removed from a world, or the world shuts down. */
  shutdown?(): void;

  sendEvent = this.world.sendEvent;
  receiveEvent = this.world.receiveEvent;

  constructor() {
    ELYSIA_DEV: assert(
      !!this.world,
      "Constructing systems manually is not allowed.",
    );
  }

  #shutdownCallbacks: Set<Function> = new Set();

  /**
   * Queue callbacks to run when system shuts down.
   * Callbacks only run once. If the system is restarted, they will need to be added again.
   * Prefer binding callbacks in startup() instead of the constructor.
   */
  whenShutdown = (...callbacks: Array<Function>): void => {
    for (let c of callbacks) {
      this.#shutdownCallbacks.add(c);
    }
  };

  #startedCallbacks: Set<
    (system: typeof this) => VoidFunction | undefined | void
  > = new Set();
  /**
   * Queue callbacks to run when system starts up.
   * Unlike whenShutdown, these callbacks are called every time the system is started.
   * You can return a function to be called when the system is stopped (same as whenShutdown).
   */
  whenStarted = (
    ...callbacks: Array<
      (system: typeof this) => VoidFunction | undefined | void
    >
  ): void => {
    for (let c of callbacks) {
      this.#startedCallbacks.add(c);
      if (this.#active) {
        const maybeShutdownCallback = c(this);
        if (isFunction(maybeShutdownCallback)) {
          this.#shutdownCallbacks.add(maybeShutdownCallback);
        }
      }
    }
  };

  #entitiesWith = this.world.entitiesWith.bind(this.world);

  #entitiesWithTag = this.world.entitiesWithTag.bind(this.world);

  #active = false;

  /* @internal */
  __runStartup() {
    ELYSIA_DEV: assert(!this.#active, "System already active");
    if (this.#active) {
      return;
    }
    this.#active = true;
    ELYSIA_PROD: {
      this.startup?.();
      for (let c of this.#startedCallbacks) {
        const maybeShutdownCallback = c(this);
        if (isFunction(maybeShutdownCallback)) {
          this.#shutdownCallbacks.add(maybeShutdownCallback);
        }
      }
    }
    ELYSIA_DEV: {
      logger.debug(`System startup: ${this.constructor.name}`);
      try {
        this.startup?.();
        for (let c of this.#startedCallbacks) {
          const maybeShutdownCallback = c(this);
          if (isFunction(maybeShutdownCallback)) {
            this.#shutdownCallbacks.add(maybeShutdownCallback);
          }
        }
        logger.success(`System startup for ${this.constructor.name} succeeded`);
      } catch (cause) {
        throw new Error(
          `System startup for ${this.constructor.name} failed: ${String((cause as any)?.message)}`,
          { cause },
        );
      }
    }
  }

  /* @internal */
  __runShutdown() {
    ELYSIA_DEV: assert(this.#active, "System already inactive");
    if (!this.#active) {
      return;
    }
    this.#active = false;
    this.#shutdownCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (cause) {
        ELYSIA_DEV: {
          throw new Error(
            `Callback for ${this.constructor.name} failed: ${String((cause as any)?.message)}`,
            {
              cause,
            },
          );
        }
      }
    });

    this.#shutdownCallbacks.clear();

    ELYSIA_PROD: {
      this.shutdown?.();
    }
    ELYSIA_DEV: {
      logger.debug(`System shutdown: ${this.constructor.name}`);
      try {
        this.shutdown?.();
        logger.debug(`System shutdown for ${this.constructor.name} succeeded`);
      } catch (cause) {
        throw new Error(
          `System shutdown for ${this.constructor.name} failed: ${String((cause as any)?.message)}`,
          { cause },
        );
      }
    }
  }

  /* @internal */
  __runUpdate(frametime: number) {
    ELYSIA_DEV: assert(this.#active, "System updated but is inactive.");
    if (!this.#active) return;
    ELYSIA_PROD: {
      this.update?.(frametime);
    }
    ELYSIA_DEV: {
      try {
        this.update?.(frametime);
      } catch (cause) {
        throw new Error(
          `System update for ${this.constructor.name} failed: ${String((cause as any)?.message)}`,
          { cause },
        );
      }
    }
  }
}

/**
 * Decorator for binding a method in a system to an event to automatically subscribe.
 * @param event - EventType to handle
 * @returns
 */
export function eventHandler<T extends EventType<any>>(event: T) {
  return function <
    This extends System,
    M extends (payload: EventData<T>) => void,
  >(method: M, { addInitializer }: ClassMethodDecoratorContext<This, M>) {
    addInitializer(function (this: This) {
      this.whenStarted(() =>
        this.receiveEvent(event, (data) => method.call(this, data)),
      );
    });
  };
}

//  █████╗  ██████╗████████╗ ██████╗ ██████╗ ███████╗
// ██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝
// ███████║██║        ██║   ██║   ██║██████╔╝███████╗
// ██╔══██║██║        ██║   ██║   ██║██╔══██╗╚════██║
// ██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║███████║
// ╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝
//

/**
 * Components with this tag can contain {@link System} lifecycle methods, which
 * are ticked by the lifecycle system.
 */
export const participatesInLifecycleTag = Symbol("ParticipatesInLifecycle");

/**
 * Base class for components that participate in the world lifecycle.
 */
export class ActorComponent implements Component {
  static get ecsTags() {
    return [participatesInLifecycleTag];
  }

  /**
   * Called when the world starts up or when this component is added to an entity in a running world.
   */
  startup(thisEntity: EntityID, world: World) {}

  /**
   * Called each frame.
   */
  update(delta: number, thisEntity: EntityID, world: World) {}

  /**
   * Called when the component is removed from an entity or when the world is shutting down.
   */
  shutdown(thisEntity: EntityID, world: World) {}

  static create(lifecycle: {
    startup?: (thisEntity: EntityID, world: World) => void;
    update?: (delta: number, thisEntity: EntityID, world: World) => void;
    shutdown?: (thisEntity: EntityID, world: World) => void;
  }) {
    return new (class extends ActorComponent {
      override startup(thisEntity: EntityID, world: World) {
        lifecycle.startup?.(thisEntity, world);
      }
      override update(delta: number, thisEntity: EntityID, world: World) {
        lifecycle.update?.(delta, thisEntity, world);
      }
      override shutdown(thisEntity: EntityID, world: World) {
        lifecycle.shutdown?.(thisEntity, world);
      }
    })();
  }
}

/**
 * System that ticks {@link ActorComponent}s.
 */
export class ActorSystem extends System {
  startup() {
    for (const [entity, actor] of this.world.entitiesWithTag(
      participatesInLifecycleTag,
    )) {
      (<ActorComponent>actor).startup?.(entity, this.world);
    }

    this.whenShutdown(
      this.world.onComponentWithTagAdded(
        participatesInLifecycleTag,
        (world, entity, c) => {
          (<ActorComponent>c).startup?.(entity, world);
        },
      ),
    );

    this.whenShutdown(
      this.world.onComponentWithTagRemoved(
        participatesInLifecycleTag,
        (world, entity, c) => {
          (<ActorComponent>c).shutdown?.(entity, world);
        },
      ),
    );
  }

  update(frametime: number): void {
    for (const [entity, actor] of this.world.entitiesWithTag(
      participatesInLifecycleTag,
    )) {
      (<ActorComponent>actor).update(frametime, entity, this.world);
    }
  }

  shutdown() {
    for (const [entity, actor] of this.world.entitiesWithTag(
      participatesInLifecycleTag,
    )) {
      (<ActorComponent>actor).shutdown?.(entity, this.world);
    }
  }
}
