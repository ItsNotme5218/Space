import { motion } from "framer-motion"
export const PageAnimation = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'absolute', width: '100%' }} 
    >
      {children}
    </motion.div>
  );
};


//// change later