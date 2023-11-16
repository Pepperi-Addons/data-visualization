import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { QuerySelectService } from "./query-select.service";

@Component({
  selector: "addon-query-select",
  templateUrl: "./query-select.component.html",
  styleUrls: ["./query-select.component.scss"],
  providers: [QuerySelectService],
})
export class QuerySelectComponent implements OnInit {
  @Input() inputVars = [];
  @Input() variablesData = undefined;
  @Input() pageParametersOptions = [];

  @Output() variablesDataChange = new EventEmitter<any>();

  constructor(public querySelectService: QuerySelectService) {
  }

  ngOnInit(): void {}

  onVariablesDataChanged(event: any, name: string, field: string) {
    let obj = {
        event: event,
        name: name,
        field: field
    }
    this.variablesDataChange.emit(obj);
  }
}
