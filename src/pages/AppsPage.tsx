import { useMemo } from "react";
import { motion } from "framer-motion";
import { ItemGrid, type GridItem } from "../components/grid";

const generateMockApps = (count: number): GridItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `app-${i + 1}`,
    title: `App ${i + 1}`,
  }));

export const AppsPage = () => {
  const apps = useMemo(() => generateMockApps(60), []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
          },
        },
      }}
      className="h-full w-full"
    >
      <ItemGrid
        items={apps}
        header={
          <motion.header
            variants={{
              hidden: { opacity: 0, y: -20, filter: "blur(10px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { type: "spring", stiffness: 300, damping: 25 },
              },
            }}
            className="mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white/92 tracking-tight">Apps</h1>
            <p className="mt-1 text-sm text-white/42">
              Explore and launch your favorite applications.
            </p>
          </motion.header>
        }
      />
    </motion.div>
  );
};
