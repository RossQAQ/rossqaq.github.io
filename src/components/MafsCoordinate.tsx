import { Mafs, Coordinates, Vector, Point, Text } from "mafs";
import "mafs/core.css";
import "mafs/font.css";

// Muted palette that matches the blog's aesthetic
const COLORS = {
  blue: "#4b7bab",
  red: "#dc5b51",
  green: "#4a9c7c",
  purple: "#5757e6",
  pink: "#c45d8a",
  orange: "#e08b55",
};

interface Props {
  width?: number;
  height?: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  showGrid?: boolean;
  vectors?: { tail?: [number, number]; tip: [number, number]; color?: string; label?: string }[];
  points?: { x: number; y: number; color?: string; label?: string }[];
  pan?: boolean;
}

export default function MafsCoordinate({
  width = 500,
  height = 500,
  xMin = -5,
  xMax = 5,
  yMin = -5,
  yMax = 5,
  showGrid = true,
  vectors = [],
  points = [],
  pan = true,
}: Props) {
  return (
    <div className="mafs-coordinate">
      <Mafs
        width={width}
        height={height}
        viewBox={{ x: [xMin, xMax], y: [yMin, yMax], padding: 0.5 }}
        pan={pan}
      >
        <Coordinates.Cartesian
          subdivisions={showGrid ? 4 : false}
        />

        {vectors.map((v, i) => {
          const c = v.color || COLORS.blue;
          const tail: [number, number] = v.tail || [0, 0];
          return (
            <Vector
              key={`vec-${i}`}
              tail={tail}
              tip={v.tip}
              color={c}
            />
          );
        })}

        {vectors.map((v, i) => {
          const c = v.color || COLORS.blue;
          return (
            v.label ? (
              <Text
                key={`vlabel-${i}`}
                x={v.tip[0]}
                y={v.tip[1]}
                attach="w"
                attachDistance={22}
                color={c}
              >
                {v.label}
              </Text>
            ) : null
          );
        })}

        {points.map((p, i) => (
          <>
            <Point
              key={`pt-${i}`}
              x={p.x}
              y={p.y}
              color={p.color || COLORS.red}
            />
            {p.label ? (
              <Text
                key={`plabel-${i}`}
                x={p.x}
                y={p.y}
                attach="n"
                attachDistance={22}
                color={p.color || COLORS.red}
              >
                {p.label}
              </Text>
            ) : null}
          </>
        ))}
      </Mafs>
    </div>
  );
}
