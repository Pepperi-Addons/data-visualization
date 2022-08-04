import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { ICardEditor, IScorecards, IScorecardsEditor } from '../card.model';
import { PageConfiguration } from '@pepperi-addons/papi-sdk';
import { PepButton } from '@pepperi-addons/ngx-lib/button';
import { Overlay } from '../models/overlay ';

@Component({
  selector: 'scorecards-editor',
  templateUrl: './scorecards-editor.component.html',
  styleUrls: ['./scorecards-editor.component.scss']
})
export class ScorecardsEditorComponent implements OnInit {

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    currentCardindex: number;
    private defaultPageConfiguration: PageConfiguration = { "Parameters": [] };
    private _pageConfiguration: PageConfiguration = this.defaultPageConfiguration;
    blockLoaded = false;
    chartsOptions: { key: string, value: string }[] = [];
    charts;
    protected pageParameters: any;
    pageParametersOptions = [];

    @Input()
    set hostObject(value: any) {
        if (value && value.configuration && Object.keys(value.configuration).length) {
            if(!this._configuration) {
              this._configuration = value.configuration;
            }
            if(value.configurationSource && Object.keys(value.configuration).length > 0){
                this.configurationSource = value.configurationSource;
            }
        } else {
            if(this.blockLoaded){
                this.loadDefaultConfiguration();
            }
        }

        this.pageParameters = value?.pageParameters || {};
        this.pageParametersOptions = []
        Object.keys(this.pageParameters).forEach(paramKey => {
        this.pageParametersOptions.push({key: paramKey, value: paramKey})
        });
        this.pageParametersOptions.push({key: "Account", value: "Account"})

        // this._pageParameters = value?.pageParameters || {};
        // this._pageConfiguration = value?.pageConfiguration || this.defaultPageConfiguration;
    }

    activeTabIndex = 0;
    public configurationSource: IScorecards;
    private _configuration: IScorecards;
    get configuration(): IScorecards {
        return this._configuration;
    }

    public textColor: Array<PepButton> = [];
    public TextPositionStyling: Array<PepButton> = [];
    public GroupTitleAndDescription: Array<PepButton> = [];
    DropShadowStyle: Array<PepButton> = [];
    PepSizes: Array<PepButton> = [];

    constructor(protected addonService: PepAddonService,
      public routeParams: ActivatedRoute,
      public router: Router,
      public route: ActivatedRoute,
      protected translate: TranslateService,
      protected dataVisualizationService: DataVisualizationService,
      public pluginService: AddonService) {}

    async ngOnInit(): Promise<void> {
        if (!this.configuration || Object.keys(this.configuration).length == 0) {
          this.loadDefaultConfiguration();
        };
        this.configuration.scorecardsConfig.editSlideIndex = -1;
        this.PepSizes = [
          { key: 'sm', value: this.translate.instant('SM') },
          { key: 'md', value: this.translate.instant('MD') },
          { key: 'lg', value: this.translate.instant('LG') },
          { key: 'xl', value: this.translate.instant('XL') }
        ];
    
        this.DropShadowStyle = [
          { key: 'Soft', value: this.translate.instant('Soft') },
          { key: 'Regular', value: this.translate.instant('Regular') }
        ];

        this.textColor = [
            { key: 'system-primary', value:this.translate.instant('GALLERY_EDITOR.TEXT_COLOR.SYSTEM'), callback: (event: any) => this.onGalleryFieldChange('cardTextColor',event) },
            { key: 'invert', value:this.translate.instant('GALLERY_EDITOR.TEXT_COLOR.INVERT'), callback: (event: any) => this.onGalleryFieldChange('cardTextColor',event) }
        ]

        this.TextPositionStyling =  [
            { key: 'overlyed', value: this.translate.instant('GALLERY_EDITOR.TEXT_POSITION.OVERLYED'), callback: (event: any) => this.onGalleryFieldChange('textPosition',event) },
            { key: 'separated', value: this.translate.instant('GALLERY_EDITOR.TEXT_POSITION.SEPARATED'), callback: (event: any) => this.onGalleryFieldChange('textPosition',event) }
        ];

        this.GroupTitleAndDescription = [
            { key: 'grouped', value: this.translate.instant('GALLERY_EDITOR.GROUP.GROUPED'), callback: (event: any) => this.onGalleryFieldChange('groupTitleAndDescription',event) },
            { key: 'ungrouped', value: this.translate.instant('GALLERY_EDITOR.GROUP.UNGROUPED'), callback: (event: any) => this.onGalleryFieldChange('groupTitleAndDescription',event) }
        ]
        
        Promise.all([
            this.pluginService.fillChartsOptions(this.chartsOptions,'Value scorecard'),
            this.pluginService.fillChartsOptions(this.chartsOptions,'Series scorecard')
        ]).then(res => {
            this.charts = (Array.from(res[0])).concat(Array.from(res[1]));
            this.updatePageConfigurationObject();
            this.updateHostObject();
            this.blockLoaded = true;
            this.hostEvents.emit({ action: 'block-editor-loaded' });
        })
    }

    ngOnChanges(e: any): void {

    }

    onFieldChange(key, event) {
      const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value : event;
  
      if (key.indexOf('.') > -1) {
          let keyObj = key.split('.');
          this._configuration[keyObj[0]][keyObj[1]] = value;
      }
      else {
          this._configuration[key] = value;
      }
      this.updateHostObject();
    }
    
    public onHostObjectChange(event) {
        if(event && event.action) {
            if (event.action === 'set-configuration') {
                this._configuration = event.configuration;
                this.updateHostObject();

                // Update page configuration only if updatePageConfiguration
                if (event.updatePageConfiguration) {
                    this.updatePageConfigurationObject();
                }
            }
        }
    }

    getSliderBackground(color) {
      if (!color) return;
      let alignTo = 'right';
  
      let col: Overlay = new Overlay();
  
      col.color = color;
      col.opacity = '100';
  
      let gradStr = this.dataVisualizationService.getRGBAcolor(col, 0) + ' , ' + this.dataVisualizationService.getRGBAcolor(col);
  
      return 'linear-gradient(to ' + alignTo + ', ' + gradStr + ')';
    }

    updateHostObject() {
        this.hostEvents.emit({
            action: 'set-configuration',
            configuration: this.configuration
        });
    }

    private updateHostObjectField(fieldKey: string, value: any) {
        this.hostEvents.emit({
            action: 'set-configuration-field',
            key: fieldKey,
            value: value
        });
    }

    private getPageConfigurationParametersNames(): Array<string> {
        const parameters = new Set<string>();

        // Go for all cards scripts and add parameters to page configuration if Source is dynamic.
        for (let index = 0; index < this._configuration.cards.length; index++) {
            const card = this._configuration.cards[index];
            
            if (card?.script?.runScriptData) {
                Object.keys(card.script.runScriptData?.ScriptData).forEach(paramKey => {
                    const param = card.script.runScriptData.ScriptData[paramKey];
        
                    if (!parameters.has(param.Value) && param.Source === 'dynamic') {
                        parameters.add(param.Value);
                    }
                });
            }
        }

        // Return the parameters as array.
        return [...parameters];
    }

    private updatePageConfigurationObject() {
        this._pageConfiguration = this.defaultPageConfiguration;
        this._pageConfiguration.Parameters.push({
            Key: 'AccountUUID',
            Type: 'String',
            Consume: true,
            Produce: false
        });
        this.hostEvents.emit({
            action: 'set-page-configuration',
            pageConfiguration: this._pageConfiguration
        });
    }


    onGalleryFieldChange(key, event) {
        const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value :  event;

        if(key.indexOf('.') > -1){
            let keyObj = key.split('.');
            this.configuration.scorecardsConfig[keyObj[0]][keyObj[1]] = value;
        }
        else{
            this.configuration.scorecardsConfig[key] = value;
        }
  
        this.updateHostObjectField(`scorecardsConfig.${key}`, value);

        if(key === 'groupTitleAndDescription' || key === 'textPosition'){
               
        }
    }

    protected loadDefaultConfiguration() {
        this._configuration = this.getDefaultHostObject();
        this.updateHostObject();
    }

    private getDefaultCard(): ICardEditor {
        let card = new ICardEditor();
        card.id = 0;

        return card;
    }

    getDefaultHostObject(): IScorecards {
        return { scorecardsConfig: new IScorecardsEditor(), cards: [this.getDefaultCard()] };
    }

  async getQueryOptions(){
    let queries = await this.pluginService.getAllQueries();
    queries = queries.filter(query =>{
      for(let s of query.Series)
        if(s.BreakBy.FieldID!='' || s.GroupBy[0].FieldID!='') return false;
      
      return true;
    })

    return queries;
  }

  addNewCardClick() {
    let card = new ICardEditor();
    card.id = (this.configuration?.cards.length);

    this.configuration?.cards.push( card);
    this.updateHostObject();
  }

  onCardEditClick(event) {
       
    if(this.configuration?.scorecardsConfig?.editSlideIndex === event.id){ //close the editor
        this.configuration.scorecardsConfig.editSlideIndex = -1;
    }
    else{ 
        this.currentCardindex = this.configuration.scorecardsConfig.editSlideIndex = parseInt(event.id);
    }
    //this.updateHostObjectField(`scorecardsConfig.editSlideIndex`, this.configuration.scorecardsConfig.editSlideIndex);
    //this.cdr.detectChanges();
    //this.updateHostObject();
  }
  
  onCardRemoveClick(event){
      this.configuration?.cards.splice(event.id, 1);
      this.configuration?.cards.forEach(function(card, index, arr) {card.id = index; });
      this.updateHostObject();
  }

  drop(event: CdkDragDrop<string[]>) {
      if (event.previousContainer === event.container) {
      moveItemInArray(this.configuration.cards, event.previousIndex, event.currentIndex);
      for(let index = 0 ; index < this.configuration.cards.length; index++){
          this.configuration.cards[index].id = index;
      }
        this.updateHostObject();
      } 
  }

  onDragStart(event: CdkDragStart) {
      this.changeCursorOnDragStart();
  }

  onDragEnd(event: CdkDragEnd) {
      this.changeCursorOnDragEnd();
  }

  changeCursorOnDragStart() {
    document.body.classList.add('inheritCursors');
    document.body.style.cursor = 'grabbing';
}

changeCursorOnDragEnd() {
    document.body.classList.remove('inheritCursors');
    document.body.style.cursor = 'unset';
}



}
