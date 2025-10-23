import {
  type PropsWithChildren,
  createContext,
  createElement,
  use,
  useEffect,
  useId,
  useState,
} from "react";
import type { Component, EntityID, World } from "@100x/engine/ecs";
import { nonNullOrThrow } from "@100x/engine/asserts";
import { constructorOf } from "@100x/engine/lib";
import type { ConstructorOf } from "@100x/engine/types";

// ██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗
// ██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
// ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
// ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
// ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
//  ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝

const entityMap = new Map<string, EntityID>();

export const ecsWorldContext = createContext<World | null>(null);

export const useWorld = () =>
  nonNullOrThrow(
    use(ecsWorldContext),
    "useWorld must be used within an WorldProvider",
  );

export const WorldProvider = (props: PropsWithChildren<{ world: World }>) =>
  createElement(
    ecsWorldContext.Provider,
    { value: props.world },
    props.children,
  );

//  ██████╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ███╗   ██╗███████╗███╗   ██╗████████╗███████╗
// ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔═══██╗████╗  ██║██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// ██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║██╔██╗ ██║█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║██║╚██╗██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝██║ ╚████║███████╗██║ ╚████║   ██║   ███████║
//  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export function useComponent<T extends Component>(initCallback: () => T) {
  const id = useId();
  const [component] = useState(initCallback);
  const world = useWorld();
  useEffect(() => {
    if (!entityMap.has(id)) {
      const entity = world.createEntity();
      entityMap.set(id, entity);
      world.addComponent(entity, component);
    } else if (
      !world.hasComponent(entityMap.get(id)!, constructorOf(component))
    ) {
      world.addComponent(entityMap.get(id)!, component);
    }
    return () => {
      if (entityMap.has(id)) {
        world.removeEntity(entityMap.get(id)!);
        entityMap.delete(id);
      }
    };
  }, [world, id, component]);
  return component;
}

export function useComponentQuery<T extends ConstructorOf<Component>[]>(
  ...components: T
) {
  const world = useWorld();
  const [state, setState] = useState(() => [
    ...world.entitiesWith(...components),
  ]);
  useEffect(() => {
    const unsubFns: VoidFunction[] = [];
    for (const component of components) {
      unsubFns.push(
        world.onComponentAdded(component, () => {
          setState([...world.entitiesWith(...components)]);
        }),
      );
      unsubFns.push(
        world.onComponentRemoved(component, () => {
          setState([...world.entitiesWith(...components)]);
        }),
      );
    }
    return () => {
      for (const unsub of unsubFns) {
        unsub();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: works
  }, components);
  return state;
}

export function useComponentResolver<T extends Component>(
  component: ConstructorOf<T>,
) {
  const world = useWorld();
  const [state, setState] = useState(() => world.resolveComponent(component));
  useEffect(() => {
    const unsub = world.onComponentAdded(component, (_, __, component) => {
      setState(component);
    });
    return () => {
      unsub();
    };
  }, [component, world]);
  return state;
}
