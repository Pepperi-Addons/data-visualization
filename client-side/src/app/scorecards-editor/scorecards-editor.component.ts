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
import { BlockHelperService } from '../block-helper/block-helper.service';

@Component({
  selector: 'scorecards-editor',
  templateUrl: './scorecards-editor.component.html',
  styleUrls: ['./scorecards-editor.component.scss']
})
export class ScorecardsEditorComponent implements OnInit {

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    currentCardindex: number;
    private _pageConfiguration: PageConfiguration = { "Parameters": [] };
    blockLoaded = false;
    chartsOptions: { key: string, value: string }[] = [];
    charts;
    protected pageParameters: any;
    pageParametersOptions = [];
	private blockHelperService: BlockHelperService;

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
		this.blockHelperService.setPageParametersOptions(value.pageParameters);
		this.pageParametersOptions = this.blockHelperService.pageParametersOptions;

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

    constructor(protected addonService: PepAddonService,
      public routeParams: ActivatedRoute,
      public router: Router,
      public route: ActivatedRoute,
      protected translate: TranslateService,
      protected dvService: DataVisualizationService,
      public pluginService: AddonService) {
		this.blockHelperService = new BlockHelperService(translate,dvService,pluginService);
	  }

    async ngOnInit(): Promise<void> {
        if (!this.configuration || Object.keys(this.configuration).length == 0) {
          this.loadDefaultConfiguration();
        }
        this.configuration.scorecardsConfig.editSlideIndex = -1;
    
        this.DropShadowStyle = this.dvService.getShadowStyles();
        
        Promise.all([
            this.pluginService.fillChartsOptions(this.chartsOptions,'Value scorecard'),
            this.pluginService.fillChartsOptions(this.chartsOptions,'Series scorecard')
        ]).then(res => {
            this.charts = (Array.from(res[0])).concat(Array.from(res[1]));
            this.blockHelperService.updateParametersToConsumeForCards(this.hostEvents, this.configuration);
            this.updateHostObject();
            this.blockLoaded = true;
            this.hostEvents.emit({ action: 'block-editor-loaded' });
        })
    }
    
    public onHostObjectChange(event) {
        if(event && event.action) {
            if (event.action === 'set-configuration') {
                this._configuration = event.configuration;
                this.updateHostObject();
            }
			if (event.action === 'set-page-configuration') {
				this.blockHelperService.updateParametersToConsumeForCards(this.hostEvents, this.configuration);
			}
        }
    }

    getSliderBackground(color) {
      if (!color) return;
      let alignTo = 'right';
  
      let col: Overlay = new Overlay();
  
      col.color = color;
      col.opacity = '100';
  
      let gradStr = this.dvService.getRGBAcolor(col, 0) + ' , ' + this.dvService.getRGBAcolor(col);
  
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

    // private updatePageConfigurationObject() {
    //     this._pageConfiguration = this.defaultPageConfiguration;
    //     this._pageConfiguration.Parameters.push({
    //         Key: 'AccountUUID',
    //         Type: 'String',
    //         Consume: true,
    //         Produce: false
    //     });
    //     this.hostEvents.emit({
    //         action: 'set-page-configuration',
    //         pageConfiguration: this._pageConfiguration
    //     });
    // }

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

    onCardEditClick(event) {
        
        if(this.configuration?.scorecardsConfig?.editSlideIndex === event.id){ //close the editor
            this.configuration.scorecardsConfig.editSlideIndex = -1;
        }
        else{ 
            this.currentCardindex = this.configuration.scorecardsConfig.editSlideIndex = parseInt(event.id);
        }
    }
}
