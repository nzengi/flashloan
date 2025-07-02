import React from "react";
import { motion } from "framer-motion";
import { FiFileText, FiDownload, FiTrash2 } from "react-icons/fi";

const Logs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Logs</h1>
        <p className="text-slate-400">System logs and monitoring</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center py-12"
      >
        <FiFileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Logs Coming Soon
        </h3>
        <p className="text-slate-400">
          Real-time log viewing and filtering will be available in the next
          update.
        </p>
      </motion.div>
    </div>
  );
};

export default Logs;
