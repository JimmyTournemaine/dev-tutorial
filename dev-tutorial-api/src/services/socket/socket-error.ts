export class SocketError {
  name: string;

  message: string;

  constructor(name: string, message: string) {
    this.name = name;
    this.message = message;
  }

  static fromError(error: Error): SocketError {
    return new SocketError(error.name, error.message);
  }

  static fromMessage(message: string): SocketError {
    return new SocketError('Error', message);
  }
}
