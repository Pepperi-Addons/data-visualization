import { Injectable } from "@angular/core";

@Injectable()
export class QuerySelectService {
  private _valueSourceOptions: any[] = [];

  get sourceOptions() {
    return this._valueSourceOptions;
  }

  constructor() {
    this.loadSourceOptions();
  }

  loadSourceOptions() {
    this._valueSourceOptions = [
      { key: "Default", value: "Default" },
      { key: "Static", value: "Static" },
      { key: "Variable", value: "Variable" },
    ];
  }

  
}
