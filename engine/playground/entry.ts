import * as Three from "three";
import {
    ActiveCameraComponent,
    RendererComponent,
    SceneComponent,
    ThreeObjectSystem,
    ThreeRenderSystem,
    Transform,
    Viewport,
    FreeLookComponent,
    FreeLookControlSystem,
    InfiniteGridHelper
} from "elysiatech/three/mod";
import {ActorSystem, ActorComponent, World} from "elysiatech/ecs";
import {Frameloop} from "elysiatech/lib";
import {nonNullOrThrow} from "elysiatech/asserts.ts";
import {PhysicalSky} from "elysiatech/three/physicalSky.ts";
import {WebGLRenderer} from "three";

const canvas = nonNullOrThrow(
    document.getElementById("viewport") as HTMLCanvasElement
)

const world = new World();

world.addSystem(FreeLookControlSystem)
world.addSystem(ActorSystem)
world.addSystem(ThreeObjectSystem);
world.addSystem(ThreeRenderSystem);

// "scene" entity
world.createEntityWith(
    Viewport.fullScreenCanvas(canvas),
    new RendererComponent(new WebGLRenderer({ canvas })),
    new SceneComponent(new Three.Scene()),
    new Three.AmbientLight(0xffffff, .1),
    new InfiniteGridHelper(),
    new Transform(),
    // new PhysicalSky(),
);

world.createEntityWith(
    new Transform(),
    new Three.Mesh(
        new Three.BoxGeometry(1, 1, 1),
        new Three.MeshStandardMaterial({color: 0x00ff00}),
    ),
    // utility method to create a single instance actor
    ActorComponent.create({
        update(deltaTime, entity, world) {
            const transform = world.getComponent(entity, Transform)!;
            transform.rotation.setFromAxisAngle(
                Transform.xAxis,
                performance.now() * 0.001,
            )
        }
    })
);

// camera entity
world.createEntityWith(
    new Transform().setPosition(0, 0, 5),
    new Three.PerspectiveCamera(75, devicePixelRatio, 0.1, 1000),
    new ActiveCameraComponent(),
    new FreeLookComponent(),
);

world.startup();
new Frameloop(world.update);
