import { LayoutEngine } from '../views/pipeline/LayoutEngine.js';
import ContainerBoxManager from './ContainerBoxManager.js';
export function initializeContainers() {
  ContainerBoxManager.init(LayoutEngine);
  ContainerBoxManager.registerBox('gpu_cluster', ['workers_hub','worker_1','worker_2','worker_3','embedding_server'], 40);
  ContainerBoxManager.registerBox('cpu_cluster', ['mapper_architecture','mapper_habits','mapper_stack'], 40);
  ContainerBoxManager.registerBox('cache_cluster', ['cache'], 40);
}
