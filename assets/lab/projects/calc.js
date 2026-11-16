// Inventory Data Manager (DI-03): page identity. The bookkeeping (summary, import plans, storage) lives in
// core/projects.js, shared with the Data Checker and the tools index; it is tested in tests/projects/test_di03.mjs.
export const TOOL = { id: 'veri-yoneticisi', version: '1.0.0-beta.1' };
export { summarize, datasetProblems, planImport } from '../core/projects.js';
