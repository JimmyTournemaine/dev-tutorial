import * as debug from 'debug';
import { EventEmitter } from 'events';
import * as Dockerode from 'dockerode';

export const log = debug('app:docker');

/**
 * An enumeration of docker cache item possible states.
 */
export type CacheItemState = 'undefined' | 'image built' | 'container created' | 'container started' | 'container stopped' | 'destroying';

/**
 * A cached item of docker.
 */
interface DockerCacheItem {
  container?: Dockerode.Container;
  state: CacheItemState;
}

/**
 * Emitted to listener on state changed/
 */
export interface StateChangedEvent {
  tutoId: string;
  state: CacheItemState;
}

/**
 * The docker containers cache.
 *
 * The purpose of this object is to prevent requesting "list"-then-"inspect" calls
 * each time we want to get a container.
 */
export class DockerCache {
  cache: Map<string, DockerCacheItem>;

  emiter: EventEmitter;

  constructor() {
    this.cache = new Map<string, DockerCacheItem>();
    this.emiter = new EventEmitter();
  }

  update(tutoId: string, state: Exclude<CacheItemState, 'container created'>): void;

  update(tutoId: string, state: 'container created', container: Dockerode.Container): void;

  /**
   * Update the state of the image/container for the given tutorial.
   *
   * If the given state is 'container-created', the container has to be provided.
   *
   * @param tutoId The tutorial identifier.
   * @param state he image/container state.
   * @param container The container if it has just been create.
   */
  update(tutoId: string, state: CacheItemState, container?: Dockerode.Container): void {
    const item: DockerCacheItem = { state };

    if (container) {
      // Get provided container
      item.container = container;
    } else if (this.cache.has(tutoId)) {
      // if item already exist
      const existing = this.cache.get(tutoId);
      item.container = existing.container;
    }

    this.cache.set(tutoId, item);
    this.emiter.emit('changed', { tutoId, state });
    log(`${tutoId}: ${state}`);
  }

  /**
   * Remove a container from the cache.
   *
   * @param tutoId The tutorial identifier.
   * @returns True if the container has been removed.
   */
  remove(tutoId: string): boolean {
    log(`${tutoId}: container removed`);

    return this.cache.delete(tutoId);
  }

  /**
   * Get the current cache state of the container.
   *
   * @param tutoId The tutorial identifier.
   * @returns The cached item.
   */
  state(tutoId: string): CacheItemState {
    return this.cache.has(tutoId) ? this.cache.get(tutoId).state : undefined;
  }

  /**
   * Get a container from the cache
   *
   * @param tutoId The tutorial identifier.
   * @returns The container if it was in the cache, otherwise it returns undefined.
   */
  container(tutoId: string): Dockerode.Container {
    return this.cache.has(tutoId) ? this.cache.get(tutoId).container : undefined;
  }

  /**
   * Listen on container state changes
   *
   * @param listener The 'changed' listener
   */
  listen(listener: (change: StateChangedEvent) => void): void {
    this.emiter.on('changed', listener);
  }
}
