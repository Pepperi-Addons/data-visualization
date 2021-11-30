export class DataQueryResponse {
    MetaData: SeriesData[];
    DataSet: { [key: string]: string }[];

    constructor() { 
        this.MetaData = [];
        this.DataSet=[];
     }  
}
export class SeriesData {
    Name: string;
    Groups: string[];
    Series: string[];

    constructor() { 
        this.Name=''
        this.Groups = [];
        this.Series=[];
     }  
}

