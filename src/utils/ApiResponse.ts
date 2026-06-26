
export class ApiResponse<T = unknown> {
  public success: true;
  public message: string;
  public data?: T;

  constructor(message: string, data?: T) {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}
