interface Storage {
  get(collection: string, id: string): Promise<any>;
  set(collection: string, id: string, data: any): Promise<void>;
  update(collection: string, id: string, data: any): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list(collection: string): Promise<string[]>; // Add the list method here
}

export default Storage;