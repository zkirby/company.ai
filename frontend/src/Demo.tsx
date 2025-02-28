import React, { useEffect, useState, useRef } from "react";
import * as PIXI from "pixi.js";
import {
  Stage as PixiStage,
  AnimatedSprite as PixiAnimatedSprite,
  Container as PixiContainer,
  useApp,
} from "@pixi/react";

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const EMPLOYEE_COUNT = 20;
const SPRITE_SHEET_JSON = "man.png";

const EmployeeSprite = ({ x, y, textures }) => {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((r) => r + 0.01);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <PixiAnimatedSprite
      textures={textures}
      x={x}
      y={y}
      anchor={0.5}
      animationSpeed={0.1666}
      isPlaying={true}
      rotation={rotation}
    />
  );
};

const OfficeGame = () => {
  const [employees, setEmployees] = useState(
    Array.from({ length: EMPLOYEE_COUNT }, () => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
    }))
  );
  const [textures, setTextures] = useState([]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const app = useApp();

  useEffect(() => {
    app.loader.add(SPRITE_SHEET_JSON).load((_, resource) => {
      const frames = Object.keys(resource[SPRITE_SHEET_JSON].data.frames).map(
        (frame) => PIXI.Texture.from(frame)
      );
      setTextures(frames);
    });
  }, [app]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) => ({
          x: emp.x + (Math.random() - 0.5) * 10,
          y: emp.y + (Math.random() - 0.5) * 10,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWheel = (event) => {
    setScale((prevScale) =>
      Math.min(Math.max(prevScale - event.deltaY * 0.001, 0.5), 2)
    );
  };

  const handleDrag = (event) => {
    if (event.buttons !== 1) return;
    setPosition((prev) => ({
      x: prev.x - event.movementX / scale,
      y: prev.y - event.movementY / scale,
    }));
  };

  return (
    <div
      onWheel={handleWheel}
      onMouseMove={handleDrag}
      style={{ overflow: "hidden" }}
    >
      <PixiStage
        width={800}
        height={600}
        options={{ backgroundColor: 0x1099bb }}
      >
        <PixiContainer
          ref={containerRef}
          scale={scale}
          x={position.x}
          y={position.y}
        >
          {textures.length > 0 &&
            employees.map((emp, index) => (
              <EmployeeSprite
                key={index}
                x={emp.x}
                y={emp.y}
                textures={textures}
              />
            ))}
        </PixiContainer>
      </PixiStage>
    </div>
  );
};

export default OfficeGame;
