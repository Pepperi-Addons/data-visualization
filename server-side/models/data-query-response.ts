export class DataQueryResponse {
    Groups: string[];
    Series: string[];
    DataSet: { [key: string]: string }[];

    constructor() { 
        this.Groups = [];
        this.Series=[];
        this.DataSet=[];
     }  
}

