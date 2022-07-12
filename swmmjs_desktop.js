/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
// All previous code should be considered for replacement.
// The following code is meant for desktop interations with
// swmm .inp files. For demonstration purposes only.
/////////////////////////////////////////////////////////
 
/////////////////////////////////
// Basic model updates
// 
// This code portion updates any section in a JSON-based 
// swmm-js model.
/////////////////////////////////

///////////////////////////////////
// String to JSON
//
// Opening a swmm.inp file usually results in a string representation
// of the swmm model. This function takes in the string,
// parses it, and returns a JSON representation of
// the model.

// Parses the .inp file text into a JSON object.
// input: 
//  text: the text contents of a .inp file.
// returns: 
//  a JSON object representing the swmm file.
function parseInput(text) {
  var regex = {
    section: /^\s*\[\s*([^\]]*)\s*\].*$/,
    value: /\s*([^\s]+)([^;]*).*$/,
    description: /^\s*;.*$/,
    comment: /^\s*;;.*$/
  },

  parser = {
    // TITLE Title/Notes needs to consume all of the lines until the next section.
    TITLE: function(model, section, line) {
      // Add the current line to the TITLE object.
      model[section] = (model[section]?model[section]+'\n':'') + line;
    },

    OPTIONS: function(model, section, m) {
      // If there is an array, and it has contents,
      if (m && m.length)
        // Create a new subsection in OPTIONS and give it those contents.
        model[section][m[0]] = m[1];
    },

    //==
    RAINGAGES: function(model, section, m) {
      // If the array m is 6 elements, use a timeseries format.
      if (m && m.length == 6){
        model[section][m[0]] = {
          Format: m[1], 
          Interval: m[2], 
          SCF: m[3], 
          Source: m[4], 
          SeriesName: m[5], 
          Description: curDesc
        };
      }
      // If the array m is 8 elements, use a file format.
      if (m && m.length == 8){
        model[section][m[0]] = {
          Format: m[1], 
          Interval: m[2], 
          SCF: m[3], 
          FILE: m[4], 
          Fname: m[5], 
          Station: m[6],
          Units: m[7],
          Description: curDesc
        }
      }
    },

    //==
    /* TEMPERATURE is an object, not an array. */
    /* Each key of TEMPERATURE is an individual object/array. */
    TEMPERATURE: function(model, section, m) {
      // If there is an array, and it has contents,
      if(!model.TEMPERATURE){model.TEMPERATURE = {}}
      if (m && m.length){
        switch(m[0]){
          case 'TIMESERIES':
            model.TEMPERATURE.TIMESERIES = m[1].trim()
            break
          case 'FILE':
            model.TEMPERATURE.FILE = {}
            model.TEMPERATURE.FILE.Fname = m[1].trim()
            if(m[2]) model.TEMPERATURE.FILE.Start = m[2].trim()
            else model.TEMPERATURE.FILE.Start = null
            break
          case 'WINDSPEED':
            switch(m[1].trim()){
              case 'MONTHLY':
                // Read in 12 numbers
                model.TEMPERATURE.WINDSPEED = {Type: 'MONTHLY', AWS: []};
                for(let i = 0; i < 12; i++){
                  model.TEMPERATURE.WINDSPEED.AWS[i] = parseFloat(m[i+2]);
                }
                break;
              case 'FILE':
                // Actual file name is in model.TEMPERATURE.File
                model.TEMPERATURE.WINDSPEED = {Type: 'FILE'};
                break;
            }
          case 'SNOWMELT':
            model.TEMPERATURE.SNOWMELT = {};
            model.TEMPERATURE.SNOWMELT.DivideTemp     = parseFloat(m[1]);
            model.TEMPERATURE.SNOWMELT.ATIWeight      = parseFloat(m[2]);
            model.TEMPERATURE.SNOWMELT.NegMeltRatio   = parseFloat(m[3]);
            model.TEMPERATURE.SNOWMELT.MSLElev        = parseFloat(m[4]);
            model.TEMPERATURE.SNOWMELT.DegLatitude    = parseFloat(m[5]);
            model.TEMPERATURE.SNOWMELT.LongCorrection = parseFloat(m[6]);
            break;
          case 'ADC':
            if(!model.TEMPERATURE.ADC) model.TEMPERATURE.ADC = {};
            switch(m[1].trim()){
              case 'IMPERVIOUS':
                model.TEMPERATURE.ADC.IMPERVIOUS = [];
                for(let i = 0; i < 10; i++){
                  model.TEMPERATURE.ADC.IMPERVIOUS[i] = parseFloat(m[i+2]);
                }
                break;
              case 'PERVIOUS':
                model.TEMPERATURE.ADC.PERVIOUS = [];
                for(let i = 0; i < 10; i++){
                  model.TEMPERATURE.ADC.PERVIOUS[i] = parseFloat(m[i+2]);
                }
                break;
            }
          }
      }
    },

    //==
    ADJUSTMENTS: function(model, section, m) {
      if (m && m.length){
        // Read in 12 numbers
        model.EVAPORATION[m[0]] = [];
        for(let i = 0; i < 12; i++){
          model.EVAPORATION[m[0]][i] = parseFloat(m[i+1]);
        }
      }
    },

    //==
    EVAPORATION: function(model, section, m) {
      if (m && m.length){
        switch(m[0]){
          case 'CONSTANT':
            model.EVAPORATION.CONSTANT = parseFloat(m[1]);
            break;
          case 'MONTHLY':
            // Read in 12 numbers
            model.EVAPORATION.MONTHLY = [];
            for(let i = 0; i < 12; i++){
              model.EVAPORATION.MONTHLY[i] = parseFloat(m[i+1]);
            }
            break;
          case 'TIMESERIES':
            model.EVAPORATION.TimeSeries = m[1].trim();
            break;
          case 'TEMPERATURE':
            model.EVAPORATION.Temperature = m[1].trim();
            break;
          case 'FILE':
            model.EVAPORATION.FILE = [];
            for(let i = 0; i < 12; i++){
              model.EVAPORATION.FILE[i] = parseFloat(m[i+1]);
            }
            break;
          case 'RECOVERY':
            model.EVAPORATION.Recovery = m[1].trim();
            break;
          case 'DRY_ONLY':
            model.EVAPORATION.DRY_ONLY = m[1].trim();
            break;
        }
      }
    },

    //==
    SUBCATCHMENTS: function(model, section,  array) {
      // If there is an array, and it has contents,
      if (array && array.length){
        model[section][array[0]] = {
          RainGage: array[1], 
          Outlet: array[2], 
          Area: parseFloat(array[3]), 
          PctImperv: parseFloat(array[4]),
          Width: parseFloat(array[5]), 
          PctSlope: parseFloat(array[6]), 
          CurbLen: parseFloat(array[7]), 
          SnowPack: array[8]?array[8]:'', 
          Description: curDesc
        }
      }
    },

    //==
    SUBAREAS: function(model, section, array) {
      // If there is an array, and it has contents,
      if (array && array.length){
        model[section][array[0]] = {
          NImperv: parseFloat(array[1]), 
          NPerv: parseFloat(array[2]), 
          SImperv: parseFloat(array[3]), 
          SPerv: parseFloat(array[4]), 
          PctZero: parseFloat(array[5]), 
          RouteTo: array[6].trim(), 
          PctRouted: array.length === 8 ? array[7].trim() : null
        }
      }
    },

    //==
    INFILTRATION: function(model, section, m) {
      // Horton and Modified Horton
      if (m && m.length == 6)
        model[section][m[0]] = {
          swmmType: 'HORTON',
          MaxRate: parseFloat(m[1]), 
          MinRate: parseFloat(m[2]), 
          Decay: parseFloat(m[3]), 
          DryTime: parseFloat(m[4]), 
          MaxInfil: parseFloat(m[5])
        }
      if (m && m.length == 3 && (
        model.OPTIONS.INFILTRATION == 'GREEN-AMPT' ||
        model.OPTIONS.INFILTRATION == 'MODIFIED')){
          model[section][m[0]] = {
            swmmType: 'GREEN',
            Psi: parseFloat(m[1]),
            Ksat: parseFloat(m[2]),
            IMD: parseFloat(m[3])
          }
      }
      if (m && m.length == 3 && 
        model.OPTIONS.INFILTRATION == 'SCS' ){
          model[section][m[0]] = {
            swmmType: 'SCS',
            CurveNo: parseFloat(m[1]),
            Ksat: parseFloat(m[2]),
            DryTime: parseFloat(m[3])
          }
      }
    },

    //==
    AQUIFERS: function(model, section, array) {
      // If there is an array, and it has contents,
      if (array && array.length){
        model[section][array[0]] = {
          Por: parseFloat(array[1]), 
          WP: parseFloat(array[2]), 
          FC: parseFloat(array[3]), 
          Ks: parseFloat(array[4]), 
          Kslp: parseFloat(array[5]), 
          Tslp: parseFloat(array[6]), 
          ETu: parseFloat(array[7]), 
          ETs: parseFloat(array[8]), 
          Seep: parseFloat(array[9]), 
          Ebot: parseFloat(array[10]), 
          Egw: parseFloat(array[11]), 
          Umc: parseFloat(array[12]), 
          Epat: array.length === 14 ? array[13].trim() : null
        }
      }
    },

    //==
    GROUNDWATER: function(model, section, array) {
      // If there is an array, and it has contents,
      if (array && array.length){
        model[section][array[0]] = {
          Aquifer: array[1].trim(),
          Node: array[2].trim(),
          Esurf: parseFloat(array[3]),
          A1: parseFloat(array[4]),
          B1: parseFloat(array[5]),
          A2: parseFloat(array[6]),
          B2: parseFloat(array[7]),
          A3: parseFloat(array[8]),
          Dsw: parseFloat(array[9]),
          // There is some special parsing used here. keep it a string.
          Egwt: array.length === 11 ? array[10].trim() : '',
          Ebot: array.length === 12 ? parseFloat(array[11]) : null,
          Egw: array.length === 13 ? parseFloat(array[12]) : null,
          Umc: array.length === 14 ? parseFloat(array[13]) : null
        }
      }
    },

    //==
    GWF: function(model, section, m) {
      if (m && m.length && m.length > 2) {
        if(m[1] == 'LATERAL'){
          model[section][m[0]] = {
            LATERAL: m.slice(2).join(' ')
          }
        }
        else if(m[1] == 'DEEP'){
          model[section][m[0]] = {
            DEEP: m.slice(2).join(' ')
          }
        }
      }
    },

    //==
    SNOWPACKS: function(model, section, m) {
      if (m && m.length && m.length > 2) {
        // Check if the object exists, if not, create one
        if(!model[section][m[0]]) model[section][m[0]] = {}
        if(m[1] == 'PLOWABLE'){
          model[section][m[0]].FLOWABLE = {
            Cmin: parseFloat(m[2]),
            Cmax: parseFloat(m[3]),
            Tbase: parseFloat(m[4]),
            FWF: parseFloat(m[5]),
            SD0: parseFloat(m[6]),
            FW0: parseFloat(m[7]),
            SNN0: parseFloat(m[8])
          }
        }
        else if(m[1] == 'IMPERVIOUS'){
          model[section][m[0]].IMPERVIOUS = {
            Cmin: parseFloat(m[2]),
            Cmax: parseFloat(m[3]),
            Tbase: parseFloat(m[4]),
            FWF: parseFloat(m[5]),
            SD0: parseFloat(m[6]),
            FW0: parseFloat(m[7]),
            SD100: parseFloat(m[8])
          }
        }
        else if(m[1] == 'PERVIOUS'){
          model[section][m[0]].PERVIOUS = {
            Cmin: parseFloat(m[2]),
            Cmax: parseFloat(m[3]),
            Tbase: parseFloat(m[4]),
            FWF: parseFloat(m[5]),
            SD0: parseFloat(m[6]),
            FW0: parseFloat(m[7]),
            SD100: parseFloat(m[8])
          }
        }
        else if(m[1] == 'REMOVAL'){
          model[section][m[0]].REMOVAL = {
            Dplow: parseFloat(m[2]),
            Fout: parseFloat(m[3]),
            Fimp: parseFloat(m[4]),
            Fperv: parseFloat(m[5]),
            Fimelt: parseFloat(m[6]),
            Fsub: m[7]?parseFloat(m[7]):null,
            Scatch: m[8]?m[8]:null
          }
        }
      }
    },

    //==
    JUNCTIONS: function(model, section, m) {
      if (m && m.length > 1)
        model[section][m[0]] = {
          Invert: parseFloat(m[1]), 
          Dmax: parseFloat(m[2]?m[2]:'0'), 
          Dinit: parseFloat(m[3]?m[3]:'0'), 
          Dsurch: parseFloat(m[4]?m[4]:'0'), 
          Aponded: parseFloat(m[5]?m[5]:'0'), 
          Description: curDesc
        }
    },

    //==
    OUTFALLS: function(model, section, m) {
      if (m && m.length){
        var type = m[2]
        if(type == 'FREE' || type == 'NORMAL'){
          model[section][m[0]] = {
            Invert: parseFloat(m[1]), 
            Type: m[2].trim(), 
            Gated: m[3]?m[3]:'NO', 
            RouteTo: m[4]?m[4]:''
          };
        }
        if(type == 'FIXED'){
          model[section][m[0]] = {
            Invert: parseFloat(m[1]), 
            Type: m[2].trim(), 
            StageData: parseFloat(m[3]),
            Gated: m[3]?m[3]:'NO', 
            RouteTo: m[4]?m[4]:''
          };
        }
        if(type == 'TIDAL'){
          model[section][m[0]] = {
            Invert: parseFloat(m[1]), 
            Type: m[2].trim(), 
            Tcurve: m[3].trim(),
            Gated: m[3]?m[3]:'NO', 
            RouteTo: m[4]?m[4]:''
          };
        }
        if(type == 'TIMESERIES'){
          model[section][m[0]] = {
            Invert: parseFloat(m[1]), 
            Type: m[2].trim(), 
            Tseries: m[3].trim(),
            Gated: m[3]?m[3]:'NO', 
            RouteTo: m[4]?m[4]:''
          };
        }
      }
    },

    //==
    STORAGE: function(model, section, m) {
      if (m && m.length){
        if(m[4].trim() === 'FUNCTIONAL'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            Ymax: parseFloat(m[2]), 
            Y0: parseFloat(m[3]), 
            Curve: m[4].trim(), 
            Coefficient: parseFloat(m[5]), 
            Exponent: parseFloat(m[6]), 
            Constant: parseFloat(m[7]),
            CurveName: '',
            Aponded: m[8]?parseFloat(m[8]):0,
            Fevap:  m[9]?parseFloat(m[9]):0,  
            Psi: m[10]?m[10]:'', 
            Ksat: m[11]?m[11]:'', 
            IMD: m[12]?m[12]:'', 
            Description: curDesc}
        } else if (m[4].trim() === 'TABULAR'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            Ymax: parseFloat(m[2]), 
            Y0: parseFloat(m[3]), 
            Curve: m[4].trim(),
            Coefficient: 0, 
            Exponent: 0, 
            Constant: 0,
            CurveName: m[5].trim(),
            Aponded: m[6]?parseFloat(m[6]):0, 
            Fevap: m[7]?parseFloat(m[7]):0, 
            Psi: m[8]?m[8]:'', 
            Ksat: m[9]?m[9]:'', 
            IMD: m[10]?m[10]: '',
            Description: curDesc}
        }
      }
    },

    //==
    DIVIDERS: function(model, section, m) {
      if (m && m.length){
        if(m[3].trim() === 'WEIR'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            DivLink: m[2].trim(), 
            Type: m[3].trim(), 
            Qmin: parseFloat(m[4]), 
            Ht: parseFloat(m[5]), 
            Cd: parseFloat(m[6]), 
            Ymax: m[7]?parseFloat(m[7]):0, 
            Y0: m[8]?parseFloat(m[8]):0, 
            Ysur: m[9]?parseFloat(m[9]):0, 
            Apond: m[10]?parseFloat(m[10]):0, 
            Description: curDesc}
        } else if (m[3].trim() === 'CUTOFF'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            DivLink: m[2].trim(), 
            Type: m[3].trim(), 
            Qmin: parseFloat(m[4]),
            Ymax: m[5]?parseFloat(m[5]):0, 
            Y0: m[6]?parseFloat(m[6]):0, 
            Ysur: m[7]?parseFloat(m[7]):0, 
            Apond: m[8]?parseFloat(m[8]):0, 
            Description: curDesc}
        } else if (m[3].trim() === 'TABULAR'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            DivLink: m[2].trim(), 
            Type: m[3].trim(), 
            Dcurve: m[4].trim(), 
            Ymax: m[5]?parseFloat(m[5]):0, 
            Y0: m[6]?parseFloat(m[6]):0, 
            Ysur: m[7]?parseFloat(m[7]):0, 
            Apond: m[8]?parseFloat(m[8]):0, 
            Description: curDesc}
        } else if (m[3].trim() === 'OVERFLOW'){
          model[section][m[0]] = {
            Elev: parseFloat(m[1]), 
            DivLink: m[2].trim(), 
            Type: m[3].trim(), 
            Ymax: m[4]?parseFloat(m[4]):0, 
            Y0: m[5]?parseFloat(m[5]):0, 
            Ysur: m[6]?parseFloat(m[6]):0, 
            Apond: m[7]?parseFloat(m[7]):0, 
            Description: curDesc}
        }
      }
    },

    //==
    CONDUITS: function(model, section, array) {
      // If there is an array, and it has contents,
      if (array && array.length){
        model[section][array[0]] = {
          Node1: array[1], 
          Node2: array[2], 
          Length: parseFloat(array[3]),   
          Roughness: parseFloat(array[4]),
          InOffset: parseFloat(array[5]), 
          OutOffset: parseFloat(array[6]), 
          InitFlow: array[7]?array[7]:'0', 
          MaxFlow: array[8]?array[8]:'', 
          Description: curDesc
        };
      }
    },

    //==
    PUMPS: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Node1: m[1], 
          Node2: m[2], 
          Pcurve: m[3], 
          Status: m[4]?m[4]:'ON',
          Startup: m[5]?parseFloat(m[5]):0, 
          Shutoff: m[6]?parseFloat(m[6]):0, 
          Description: curDesc
      }
    },

    //==
    ORIFICES: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Node1: m[1], 
          Node2: m[2], 
          Type: m[3].trim(), 
          Offset: parseFloat(m[4]), 
          Cd: parseFloat(m[5]), 
          Gated: m[6]?m[6].trim():'NO',
          Orate: m[7]?parseFloat(m[7]):0,
          Description: curDesc
      }
    },

    //==
    WEIRS: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Node1: m[1], 
          Node2: m[2], 
          Type: m[3].trim(), 
          CrestHt: parseFloat(m[4]), 
          Cd: parseFloat(m[5]), 
          Gated: m[6]?m[6].trim():'NO',
          EC: m[7]?parseFloat(m[7]):0,
          Cd2: m[8]?parseFloat(m[8]):m[5],
          Surcharge: m[9]?m[9]:'YES',
          Width: m[10]?m[10]:'',
          Surface: m[11]?m[11]:'',
          Description: curDesc
      }
    },

    //==
    OUTLETS: function(model, section, m) {
      if (m && m.length){
        if(m[4].trim() === 'TABULAR/HEAD' || 
           m[4].trim() === 'TABULAR/DEPTH'){
          model[section][m[0]] = {
            Node1: m[1], 
            Node2: m[2], 
            Offset: parseFloat(m[3]), 
            Type: m[4].trim(),
            Qcurve: m[5].trim(),
            Gated: m[6]?m[6]:'NO',
            Description: curDesc
          }
        } else {
          model[section][m[0]] = {
            Node1: m[1], 
            Node2: m[2], 
            Offset: parseFloat(m[3]), 
            Type: m[4].trim(),
            C1: parseFloat(m[5]), 
            C2: parseFloat(m[6]),
            Gated: m[7]?m[7]:'NO',
            Description: curDesc
          }
        }
      }
    },

    //==
    XSECTIONS: function(model, section, m) {
      if (m && m.length && m.length > 2) {
        if(m[1] == 'CUSTOM'){
          model[section][m[0]] = {
            swmmType: 'CUSTOM',
            Geom1: parseFloat(m[2]),
            Curve: m[3],
            Barrels: m[4]?parseFloat(m[4]):1
          }
        }
        else if(m[1] == 'IRREGULAR'){
          model[section][m[0]] = {
            swmmType: 'IRREGULAR',
            Tsect: m[2]
          }
        }
        else {
          model[section][m[0]] = {
            swmmType: 'SHAPE',
            Shape: m[1], 
            Geom1: m[2], 
            Geom2: m[3], 
            Geom3: m[4], 
            Geom4: m[5], 
            Barrels: m[6]?parseFloat(m[6]):1,
            Culvert: m[7]?m[7]:''
          }
        }
      }
    },

    //==
    // There are three different ways to start a transects line.
    // The first is optional, but necessary for the first record:
    //    NC: 3 floats that represent N
    //    X1: Descriptions of the transect
    //    GR: List of stations and elevations
    TRANSECTS: function(model, section, m) {
      if (m && m.length) {
        // If this line starts with 'NC', then just set up the CORD object.
        if(m[0] == 'NC'){
          // Clean out CORData
          cleanCORData()
          CORData.Type = 'TRANSECTS'
          CORData.Name = ''
          CORData.Nleft = parseFloat(m[1])
          CORData.Nright = parseFloat(m[2])
          CORData.Nchanl = parseFloat(m[3])
        }
        if(m[0] == 'X1'){
          CORData.Name = m[1]
          model[section][m[1]] = {
            Nsta: parseFloat(m[2]),
            Xleft: parseFloat(m[3]),
            Xright: parseFloat(m[4]),
            Lfactor: parseFloat(m[7]),
            Wfactor: parseFloat(m[8]),
            Eoffset: parseFloat(m[9]),
            Nleft: CORData.Nleft,
            Nright: CORData.Nright,
            Nchanl: CORData.Nchanl
          }
        }
        else if(m[0] == 'GR'){
          model[section][CORData.Name].GR = []
          // Parse the station/elevation array {'Elev': 204.4, 'Station': 101.5}
          for(var i = 1; i<m.length; i=i+2)
          model[section][CORData.Name].GR.push({
            Elev: parseFloat(m[i]), 
            Station: parseFloat(m[i+1])
          })
        }
      }
    },

    //==
    LOSSES: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Kin: parseFloat(m[1]), 
          Kout: m[2].trim(), 
          Kavg: m[3].trim(), 
          Flap: m[4]?m[4].trim():'NO', 
          Seepage: m[5]?parseFloat(m[5]):0
        }
    },

    //==
    POLLUTANTS: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Units: m[1].trim(), 
          Cppt: parseFloat(m[2]), 
          Cgw: parseFloat(m[3]), 
          Crdii: parseFloat(m[4]), 
          Kdecay: parseFloat(m[5]), 
          SnowOnly: m[6]?m[6].trim():'NO', 
          CoPollutant: m[7]?m[7].trim():'*', 
          CoFrac: m[8]?parseFloat(m[8]):0, 
          Cdwf: m[9]?parseFloat(m[9]):0,  
          Cinit: m[10]?parseFloat(m[10]):0
        }
    },

    //==
    LANDUSES: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          Interval: m[1]?m[1].trim():'', 
          Available: m[2]?m[2].trim():'', 
          Cleaned: m[3]?m[3].trim():''
        }
    },

    //!!
    BUILDUP: function(model, section, m) {
      if (m && m.length)
        // If there is not a BUILDUP array for this 
        // landuse, create one.
        if(!model[section][m[0]]){
          model[section][m[0]] = []
        }
        let thisObj = { 
          Pollutant: m[1]
        }
        if(m.length > 2){thisObj.Function = m[2];}
        else {thisObj.Function = null;}
        if(thisObj.Function === 'NONE' || thisObj.Function === null) { // NONE
          thisObj.Coeff1     = 0;
          thisObj.Coeff2     = 0;
          thisObj.Coeff3     = 0;
          thisObj.Normalizer = 'AREA';
        }
        if(thisObj.Function === 'POW') { // POW
          thisObj.Coeff1     = parseFloat(m[3]);
          thisObj.Coeff2     = parseFloat(m[4]);
          thisObj.Coeff3     = parseFloat(m[5]);
          thisObj.Normalizer = m[6];
        }
        if(thisObj.Function === 'EXP') { // EXP
          thisObj.Coeff1     = parseFloat(m[3]);
          thisObj.Coeff2     = parseFloat(m[4]);
          thisObj.Coeff3     = parseFloat(m[5]);
          thisObj.Normalizer = m[6];
        }
        if(thisObj.Function === 'SAT') { // SAT
          thisObj.Coeff1     = parseFloat(m[3]);
          thisObj.Coeff2     = parseFloat(m[4]);
          thisObj.Coeff3     = parseFloat(m[5]);
          thisObj.Normalizer = m[6];
        }
        if(thisObj.Function === 'EXT') { // EXT
          thisObj.maxBuildup  = parseFloat(m[3]);
          thisObj.scaleFactor = parseFloat(m[4]);
          thisObj.timeSeries  = m[5];
          thisObj.Normalizer  = m[6];
        }
        // Push the new BUILDUP object to the array.
        model[section][m[0]].push(thisObj)
    },  

    //==
    WASHOFF: function(model, section, m) {
      // If there is not a WASHOFF array for this 
      // landuse, create one.
      if(!model[section][m[0]]){
        model[section][m[0]] = []
      }
      if (m && m.length)
        model[section][m[0]].push({
          Pollutant: m[1].trim(), 
          Function: m[2].trim(),
          Coeff1: parseFloat(m[3]) || 0,
          Coeff2: parseFloat(m[4]) || 0,
          Ecleaning: parseFloat(m[5]) || 0,
          Ebmp: m[6]?m[6].trim():''
        })
    },  

    //==
    COVERAGES: function(model, section, m) {
      if (m && m.length)
        // If there is not a COVERAGE array for this 
        // subcatchment, create one.
        if(!model[section][m[0]]){
          model[section][m[0]] = []
        }
        // Push all the new COVERAGE objects on to the 
        // array.
        for(var i = 1; i<m.length; i=i+2)
          model[section][m[0]].push({
            LandUse: m[i].trim(), 
            Percent: parseFloat(m[i+1])
          })
    },

    //==
    INFLOWS: function(model, section, m) {
      if (m && m.length){
        model[section][m[0]] = {
          Parameter: m[1].trim(), 
          Timeseries: m[2].trim(),
          Type: m[3] ? m[3].trim() : '',
          UnitsFactor: m[4] ? parseFloat(m[4]) : 1.0,
          ScaleFactor: m[5] ? parseFloat(m[5]) : 1.0,
          Baseline: m[6] ? parseFloat(m[6]) : 0,
          Pattern: m[7] ? m[7].trim() : ''
        }
      }
    }, 

    //==
    DWF: function(model, section, m) {
      if (m && m.length){
        model[section][m[0]] = {
          Type: m[1].trim(), 
          Base: m[2] ? parseFloat(m[2]) : 1.0,
          Pat1: m[3] ? m[3].trim() : '',
          Pat2: m[4] ? m[4].trim() : '',
          Pat3: m[5] ? m[5].trim() : '',
          Pat4: m[6] ? m[6].trim() : ''
        }
      }
    },

    //==
    PATTERNS: function(model, section, m) {
      if (m && m.length){
        model[section][m[0]] = {
          Type: m[1].trim(),
          Factors: []
        }
        // Push all the new PATTERNS objects on to the 
        // array.
        for (var i = 2; i<m.length; i=i+1)
        model[section][m[0]].Factors.push(parseFloat(m[i]))
      }
    },

    //==
    // There are two different ways to start a hydrographs line.
    //    Name Raingage
    //    Name Month SHORT/MEDIUM/LONG R T K (Dmax Drec D0)
    HYDROGRAPHS: function(model, section, m) {
      if (m && m.length) {
        if(m.length == 2){
          // Add a new HYDROGRAPHS object
          model[section][m[0]] = { Raingage: m[1], Months: {}}
        }
        else {
          rec = model[section][m[0]]
          rec.Months[m[1]]?null:rec.Months[m[1]] = {}
          rec.Months[m[1]][m[2]] = {
            R : parseFloat(m[3]),
            T : parseFloat(m[4]),
            K : parseFloat(m[5]),
            Dmax : m[6]?parseFloat(m[6]):null,
            Drec : m[7]?parseFloat(m[7]):null,
            D0   : m[8]?parseFloat(m[8]):null
          }
        }
      }
    },

    //==
    RDII: function(model, section, m) {
      if (m && m.length){
        model[section][m[0]] = {
          UHgroup: m[1].trim(), 
          SewerArea: m[2] ? parseFloat(m[2]) : 0
        }
      }
    },

    //==
    LOADINGS: function(model, section, m) {
      if (m && m.length)
        // If there is not a LOADING array for this 
        // subcatchment, create one.
        if(!model[section][m[0]]){
          model[section][m[0]] = []
        }
        // Push all the new LOADING objects on to the 
        // array.
        for(var i = 1; i<m.length; i=i+2)
          model[section][m[0]].push({
            Pollutant: m[i].trim(), 
            InitLoad: parseFloat(m[i+1])
          })
    }, 

    //==
    TREATMENT: function(model, section, m) {
      if (m && m.length)
        // If there is not a TREATMENT array for this 
        // subcatchment, create one.
        if(!model[section][m[0]]){
          model[section][m[0]] = []
        }
        model[section][m[0]][m[1]] = m.slice(2).join(' ')
    }, 

    //==
    CURVES: function(model, section, m) {
      if (m && m.length > 0){
        // Index track for lines with 'Type' attribute.
        var i = 1

        // If there is not a CURVE array for this 
        // subcatchment, create one.
        if(!model[section][m[0]]){
          model[section][m[0]] = {
            Type: m[1],
            Curve: []
          }
          i = 2
        }

        // Push all the new CURVE objects on to the 
        // array.
        for(;i<m.length; i=i+2)
          model[section][m[0]].Curve.push({
            x: parseFloat(m[i]), 
            y: parseFloat(m[i+1])
          })
      }
    },

    // TIMESERIES is a special case. TIMESERIES is either
    // of the following formats:
    // Date/Time stucture:
    //  [
    //    SeriesName <string>: 
    //    [ 
    //      {
    //        Date <string>: 'mm-dd-yyyy' or 'mm/dd/yyyy',
    //        Curve: [
    //          { 
    //            Time <string>: '24:60' format
    //            Value <number>: required
    //          }, ...
    //        ]
    //      }, 
    //    ], ...
    //  ]
    // Time since simulation start:
    //  [
    //    SeriesName <string>: 
    //    [ 
    //      { 
    //        Time <number>: decimal format, translated from decimal or '24:60' format.
    //        Value <number>: required
    //      }, ...
    //    ], ...
    //  ]
    // File input:
    //  [
    //    SeriesName <string>: 
    //    { 
    //      Fname <string>: string for the file name
    //    }, ...
    //  ]
    //==
    // This whole section needs to be rewritten.
    TIMESERIES: function(model, section, m) {
      
        //==================================
        // I need a function that tests if
        // a given TIMESERIES is valid and what
        // kind it is:
        function swmmType_TIMESERIES(timeseries){
          // Check the first object in a timeseries
          if(typeof timeseries == 'undefined' || typeof timeseries[0] == 'undefined'){
            return 'none'
          }
          if(typeof timeseries[0].Date !== 'undefined'){
            return 'Date'
          }
          if(typeof timeseries[0].Time !== 'undefined'){
            return 'Time'
          }
          return 'none'
        }
        // All input to this function should be
        // a string. strings without ':' will
        // be treated as floats and translated to a HH:MM
        // format
        function floatToHHMM(thisTime){
          if(thisTime.indexOf(':') == -1){
            var tempTime = parseFloat(thisTime)
            return (tempTime.toFixed(0).toString()+':'+(((tempTime-tempTime.toFixed(0))*60).toFixed(0) ).toString().padEnd(2, '0') )
          }else{
            return thisTime
          }
        }

      if (m && m.length > 0){
        // If there is no array for this timeseries, 
        // create one.
        if(isValidData(model[section][m[0]])){
          if(!Array.isArray(model[section][m[0]])){
            model[section][m[0]] = []
          }
        } else {
          model[section][m[0]] = []
        }
        // Check if m[1] is in a valid date format
        if(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(m[1]) ||
           /^\d{1,2}-\d{1,2}-\d{2,4}$/.test(m[1]) ){
            // If it is:
            // Place the date into thisDate
            var thisDate = m[1]

            // For each time/value pair afterward:
            // append {date+time, value} to the m[0] array
            for(var i = 2; i < m.length; i=i+2){
              model[section][m[0]].push({
                Date: thisDate.replaceAll('/','-').replace(/(^|-)0+/g, "$1") + ' ' + m[i], 
                Value: parseFloat(m[i+1])
              })
            }
        } 
        // else if m[1] is a file type
        else if (m[1] == 'FILE'){
          model[section][m[0]] = []
          model[section][m[0]].push(m[2])
        }


        // else this is either continuation of a date array
        // or the start of or continuation of a time array
        // This can be detected by getting the most recent 
        // object 'rec' appended to the array and checking 
        // for a string
        // 
        // If 'rec' is a string, then get the date from
        // the string and for each time/value pair afterward:
        // append {date+time, value} to the m[0] array.
        //
        else if(swmmType_TIMESERIES(model[section][m[0]]) == 'Date'){
          var thisDate = model[section][m[0]].slice(-1)[0].Date.split(' ')[0]
          for(var i = 1; i < m.length; i=i+2)
            //This should translate floats/integers to 0:00 format
            model[section][m[0]].push({
              Date: thisDate + ' ' + floatToHHMM(m[i]), 
              Value: parseFloat(m[i+1])
            })
        }
        // If 'rec' is a number, then for each time/value
        // pair afterward, append
        // {number, value} to the m[0] array
        // 
        // TIMESERIES FORMAT NEEDS TO BE RETHOUGHT.
        // OR DETECTION NEEDS TO BE BETTER
        // BECAUSE THIS FORMAT CAN BE A STRING OR A NUMBER
        else {
          for(var n = 1; n < m.length - 1 ; n=n+2){
            var thisTime = 0;
            //If the date is in hh:mm format, translate it
            if(typeof m[n] == 'string'){
              if(m[n].indexOf(':') > 0){
                thisTime = parseFloat(m[n].split(':')[0]) + 
                          parseFloat(m[n].split(':')[1])/60.0
              }else{
                thisTime = parseFloat(m[n])
              }
            } else {
              thisTime = parseFloat(m[n])
            }
            model[section][m[0]].push({
              Time: thisTime, 
              Value: parseFloat(m[n+1])
            })
          }
        }
      }
    },

    //==
    // Use CORData to remember the name of the rule.
    CONTROLS: function(model, section, m) {
        if (m && m.length) {
          // If this line starts with 'NC', then just set up the CORD object.
          if(m[0] == 'RULE'){
            // Clean out CORData
            cleanCORData()
            CORData.Type = 'CONTROLS'
            CORData.Name = m[1]
            model[section][m[1]] = []
          }
          else {
            model[section][CORData.Name].push(m.join(' '))
          }
        }
    },

    //==
    REPORT: function(model, section, m) {
      // If there is an array, and it has contents,
      if (m && m.length)
        // If m[0] is any of SUBCATCHMENTS NODES LINKS LID,
        // read in a series of strings and give m[1] that array as contents
        if((m[0] == 'SUBCATCHMENTS' || m[0] == 'NODES' || m[0] == 'LINKS' || m[0] == 'LID')){
          if (!model[section][m[0]]) 
            model[section][m[0]] = [];
          for(var i = 1; i < m.length; i=i+1)
            //This should translate floats/integers to 0:00 format
            model[section][m[0]].push(m[i])
        }
        else {
          model[section][m[0]] = m[1];
        }
    },

    //==
    MAP: function(model, section, m) {
      // If there is an array, and it has contents,
      if (m && m.length)
        // If m[0] is DIMENSIONS,
        // read in a series of floats
        if(m[0] == 'DIMENSIONS' ){
          if (!model[section][m[0]]) 
            model[section][m[0]] = {
              x1: parseFloat(m[1]),
              y1: parseFloat(m[2]),
              x2: parseFloat(m[3]),
              y2: parseFloat(m[4])
            }
        }
        else {
          model[section][m[0]] = m[1];
        }
    },

    //==
    COORDINATES: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          x: parseFloat(m[1]), 
          y: parseFloat(m[2])
        }
    },

    //!!
    VERTICES: function(model, section, m) {
        v = model[section][m[0]] || [],
        c = {};
        if (m && m.length) {
          c.x = parseFloat(m[1]);
          c.y = parseFloat(m[2]);
        }
        v[v.length] = c;
        model[section][m[0]] = v;
    },

    //!!
    Polygons: function(model, section, m) {
      if (!model[section][m[0]]) 
        model[section][m[0]] = [];
          
      if (Object.keys(model[section][m[0]]).length === 0)
        model[section][m[0]] = [];

      if (m && m.length) {
        var coord = {x: parseFloat(m[1]), y: parseFloat(m[2])};
        model[section][m[0]].push(coord);
      }
    },

    //==
    SYMBOLS: function(model, section, m) {
      if (m && m.length)
        model[section][m[0]] = {
          x: parseFloat(m[1]), 
          y: parseFloat(m[2])
        }
    },  

    //==
    LABELS: function(model, section, m) {
      if (m && m.length){
        if(!Array.isArray(model[section]))
          model[section] = []
        model[section].push({
          x: parseFloat(m[0]), 
          y: parseFloat(m[1]), 
          Label: m[2],
          Attrs: m.slice(3).join(' ')
        })
      }
    },

    //==
    BACKDROP: function(model, section, m) {
      if (m && m.length) {
        if(!isValidData(model[section].File)){
          model[section] = {
            File: m.slice(1).join(' ')
          }
        } else {
          model[section].x1 = parseFloat(m[1])
          model[section].y1 = parseFloat(m[2])
          model[section].x2 = parseFloat(m[3])
          model[section].y2 = parseFloat(m[4])
        }
      }
    },  

    //==
    TAGS: function(model, section, m) {
        if (m && m.length){
          if(!Array.isArray(model[section])) model[section] = []
          model[section].push({
            Type: m[0].trim(), 
            ID: m[1].trim(), 
            Tag: m[2].trim()
          })
        }
    },

    //!!
    PROFILE: function(model, section, m) {
      if (m && m.length > 1)
        model[section][Object.keys(model[section]).length] = {Value: m.join(' ')};
    }, 

    //!!
    FILE: function(model, section, m) {
      if (m && m.length > 1)
        section[Object.keys(model[section]).length] = {Value: m.join(' ')};
    },

    //==
    LID_CONTROLS: function(model, section, m) {
      if (m && m.length){
        // If there is not a LID_CONTROLS object, make one.
        if(!isValidData(model[section][m[0]])){
          model[section][m[0]] = { Type: m[1] }
          return
        }
        var obj = model[section][m[0]]
        switch(m[1]){
          case('SURFACE'):
            obj.SURFACE = {
              StorHt: m[2],
              VegFrac: m[3],
              Rough: m[4],
              Slope: m[5],
              Xslope: m[6]?m[6]:0
            }
            break
          case('SOIL'):
            obj.SOIL = {
              Thick: m[2],
              Por: m[3],
              FC: m[4],
              WP: m[5],
              Ksat: m[6],
              Kcoeff: m[7],
              Suct: m[8]
            }
            break
            case('PAVEMENT'):
            obj.PAVEMENT = {
              Thick: m[2],
              Vratio: m[3],
              FracImp: m[4],
              Perm: m[5],
              Vclog: m[6]
            }
            break
            case('STORAGE'):
            obj.STORAGE = {
              Height: m[2],
              Vratio: m[3],
              Seepage: m[4],
              Vclog: m[5]
            }
            break
            case('DRAIN'):
            obj.DRAIN = {
              Coeff: m[2],
              Expon: m[3],
              Offset: m[4],
              Delay: m[5],
              Open: m[6]?parseFloat(m[6]):0,
              Close: m[7]?parseFloat(m[7]):0,
              Curve: m[8]?m[8]:''
            }
            break
            case('DRAINMAT'):
            obj.DRAINMAT ={
              Thick: m[2],
              Vratio: m[3],
              Rough: m[4]
            }
            break
        }
      }
    }, 

    //==
    LID_USAGE: function(model, section, m) {
      if (m && m.length){
        // If there is not a LID_USAGE object, make one.
        if(!isValidData(model[section][m[0]])){
          model[section][m[0]] = {}
        }
        var obj = model[section][m[0]]
        obj[m[1]] = {
          Number: parseFloat(m[2]),
          Area: parseFloat(m[3]),
          Width: parseFloat(m[4]),
          InitSat: parseFloat(m[5]),
          FromImp: parseFloat(m[6]),
          ToPerv: parseFloat(m[7]),
          RptFile: m[8]?m[8]:'*',
          DrainTo: m[9]?m[9]:'',
          FromPerv: m[10]?parseFloat(m[10]):0
        }
      }
    },

    //!!
    EVENT: function(model, section, m) {
      if (m && m.length > 1)
        model[section][Object.keys(model[section]).length] = {Value: m.join(' ')};
    },
  },

  // Since this file is unlikely to be much like any previous file, simply
  // build a new object rather than diff. This allows the object to be rebuilt
  // without affecting the components on each CUD.
  model = {   // Input file model variables. Related to a header in .inp file.
    TITLE: "",              OPTIONS: {},            RAINGAGES: {},
    TEMPERATURE: {},        EVAPORATION: {},
    SUBCATCHMENTS: {},      SUBAREAS: {},           INFILTRATION: {},
    AQUIFERS: {},           GROUNDWATER: {},        GWF: {},
    SNOWPACKS: {},
    JUNCTIONS: {},          OUTFALLS: {},           STORAGE: {},
    DIVIDERS: {},
    CONDUITS: {},           PUMPS: {},              ORIFICES: {},
    WEIRS: {},              OUTLETS: {},            XSECTIONS: {},
    TRANSECTS: {},          LOSSES: {},             POLLUTANTS: {},
    LANDUSES: {},           BUILDUP: {},            WASHOFF: {},
    COVERAGES: {},          INFLOWS: {},            DWF: {},
    PATTERNS: {},           RDII: {},               HYDROGRAPHS: {},
    LOADINGS: {},           TREATMENT: {},          CURVES: {},
    TIMESERIES: [],         CONTROLS: {},           REPORT: {},
    MAP: {},                COORDINATES: {},        VERTICES: {},
    Polygons: {},           SYMBOLS: {},            LABELS: {},
    BACKDROP: {},           TAGS: {},               PROFILE: {},
    FILE: {},               LID_CONTROLS: {},       LID_USAGE: {},
    EVENT: {},
  },
  lines = text.split(/\r\n|\r|\n/),
  section = null;

  let curDesc = '';
  // CORData is cross object reference data for the parser.
  // If any object takes up more than one line or needs to
  // reference a previously inserted object, that info should
  // be found in the CORData. This is used in transects, but should
  // also be used in the Timeseries objects and probably a few others.
  let CORData = { Type: 'NONE' }

  // Call cleanCORData when you are making a new CORData entry
  // and you no longer need anything from the previous CORData entry
  function cleanCORData(){
    CORData = Object.keys(CORData).filter(key =>
      key == 'Type').reduce((obj, key) =>
      {
        obj[key] = CORData[key]
        return obj
      }, {}
      )
  }
  
  lines.forEach(function(line) {
    // If the entry is a comment, then attempt to assign it as 
    // the description for the current object.
    if (regex.comment.test(line)) {
      curDesc = '';
    } 
    // If the line is a description
    else if (regex.description.test(line)) {
      // Get the comment without the semicolon
      curDesc = line.slice(1, line.length);
    } 
    // If the line is a section header
    else if (regex.section.test(line)) {
      var s = line.match(regex.section);
      // If the section has not yet been created, create one.
      if ('undefined' === typeof model[s[1].trim()])
      {
        model[s[1].trim()] = [];
      } 
      section = s[1].trim();
    } 
    // If the line is a data line
    else if (regex.value.test(line)) {
      // Remove everything after the first semicolon:
      line = line.split(';')[0];

      // If the parser has a function for the section, run that
      if (parser[section]){
        // If the section is just title, send the data as a line.
        if(section == 'TITLE')
          parser[section](model, section, line, curDesc);
        // else, trim input, split into whitespace array 
        else {
          //var array = line.trim().split(/\b\s+/);
          var array = line.trim().split(/\s+/);
          parser[section](model, section, array, curDesc);
        }
      }
      // It the parser doesn't have a function for the section, 
      // then just read each line in as a string to an array.
      else{
        // if it is an unknown section
        if ('undefined' === typeof model[section]){
          model[section] = [line];
        } 
        // If the section exists, just destructure and append.
        else {
          model[section] = [...model[section], line]
        }
      }
      curDesc = '';
    };
  });

  //console.log(model);
  return model;
};

// Creates a string in the style of an .inp file. This is used for either running a model
// or saving a model. Once saving is more seamless, models should be autosaved before running.
// Right now, autosaving just adds more clicks.
function dataToInpString(model){
  let fullString = '';

  var parser = {
    // TITLE Title/Notes needs to consume all of the lines until the next section.
    TITLE: function(model) {
      return '[TITLE]\n' + model['TITLE'];
    },

    OPTIONS: function(model) {
      let secStr = 'OPTIONS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 21)
        inpString += strsPad(rec, 17)
        inpString += '\n';
      }
      return inpString;
    },

    EVAPORATION: function(model) {
      let secStr = 'EVAPORATION'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 16)
        if(entry == 'CONSTANT')
          inpString += numsPad(rec, 11)
        if(entry == 'MONTHLY'){
          for(let val in rec)
            inpString += numsPad(val, 0)
        }
        if(entry == 'TimeSeries')
          inpString += strsPad(rec, 11)
        if(entry == 'Temperature')
          inpString += strsPad(rec, 11)
        if(entry == 'FILE'){
          for(let val in rec)
            inpString += numsPad(val, 0)
        }
        if(entry == 'Recovery')
          inpString += strsPad(rec, 11)
        if(entry == 'DRY_ONLY')
          inpString += strsPad(rec, 11)

        inpString += '\n';
      }
      return inpString;
    },

    RAINGAGES: function(model) {
      let secStr = 'RAINGAGES'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Format, 9)
        inpString += strsPad(rec.Interval, 8)
        inpString += numsPad(rec.SCF, 8)
        inpString += strsPad(rec.Source, 11)
        inpString += strsPad(rec.SeriesName, 11)
        inpString += '\n';
      }
      return inpString;
    },

    TEMPERATURE: function(model){
      let secStr = 'TEMPERATURE'
      let inpString = sectionCap(secStr)
      if(model.TEMPERATURE.File) inpString += 'FILE ' + model.TEMPERATURE.File + ' ' + model.TEMPERATURE.FileStart || '' + '\n';
        if(model.TEMPERATURE.TIMESERIES) inpString += 'TIMESERIES ' + model.TEMPERATURE.TIMESERIES + '\n';
        if(model.TEMPERATURE.WINDSPEED){
          inpString += 'WINDSPEED '
          inpString += model.TEMPERATURE.WINDSPEED.Type
          if(model.TEMPERATURE.WINDSPEED.AWS){
            for (let entry in model.TEMPERATURE.WINDSPEED.AWS) {
              inpString += ' ' + model.TEMPERATURE.WINDSPEED.AWS[entry].toString();
            }
          }
          inpString += '\n'
        }
        if(model.TEMPERATURE.SNOWMELT){
          inpString += 'SNOWMELT '
          inpString += model.TEMPERATURE.SNOWMELT.DivideTemp     + ' '
          inpString += model.TEMPERATURE.SNOWMELT.ATIWeight      + ' '
          inpString += model.TEMPERATURE.SNOWMELT.NegMeltRatio   + ' '
          inpString += model.TEMPERATURE.SNOWMELT.MSLElev        + ' '
          inpString += model.TEMPERATURE.SNOWMELT.DegLatitude    + ' '
          inpString += model.TEMPERATURE.SNOWMELT.LongCorrection;
          inpString += '\n'
        }
        if(model.TEMPERATURE.ADC){
          if(model.TEMPERATURE.ADC.IMPERVIOUS){
            inpString += 'ADC IMPERVIOUS'
            for (let entry in model.TEMPERATURE.ADC.IMPERVIOUS) {
              inpString += ' ' + model.TEMPERATURE.ADC.IMPERVIOUS[entry].toString()
            }
          }
          inpString += '\n'
          if(model.TEMPERATURE.ADC.PERVIOUS){
            inpString += 'ADC PERVIOUS'
            for (let entry in model.TEMPERATURE.ADC.PERVIOUS) {
              inpString += ' ' + model.TEMPERATURE.ADC.PERVIOUS[entry].toString()
            }
          }
          inpString += '\n'
        }
        return inpString
    },

    SUBCATCHMENTS: function(model) {
      let secStr = 'SUBCATCHMENTS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.RainGage, 16)
        inpString += strsPad(rec.Outlet, 16)
        inpString += numsPad(rec.Area, 8)
        inpString += numsPad(rec.PctImperv, 8)
        inpString += numsPad(rec.Width, 8)
        inpString += numsPad(rec.PctSlope, 8)
        inpString += numsPad(rec.CurbLen, 11)
        if(isValidData(rec.SnowPack))
          inpString += strsPad(rec.SnowPack, 11)

        inpString += '\n';
      }
      return inpString;
    },

    SUBAREAS: function(model) {
      let secStr = 'SUBAREAS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.NImperv, 10)
        inpString += numsPad(rec.NPerv, 10)
        inpString += numsPad(rec.SImperv, 10)
        inpString += numsPad(rec.SPerv, 10)
        inpString += numsPad(rec.PctZero, 10)
        inpString += numsPad(rec.RouteTo, 10)
        if(isValidData(rec.PctRouted))
          inpString += strsPad(rec.PctRouted, 11)

        inpString += '\n';
      }
      return inpString;
    },

    INFILTRATION: function(model) {
      let secStr = 'INFILTRATION'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        switch(rec.swmmType){
          case ('HORTON'):
            inpString += numsPad(rec.MaxRate, 10)
            inpString += numsPad(rec.MinRate, 10)
            inpString += numsPad(rec.Decay, 10)
            inpString += numsPad(rec.DryTime, 10)
            inpString += numsPad(rec.MaxInfil, 10)
            break
          case ('GREEN'):
            inpString += numsPad(rec.Psi, 10)
            inpString += numsPad(rec.Ksat, 10)
            inpString += numsPad(rec.IMD, 10)
            break
          case ('SCS'):
            inpString += strsPad(rec.CurveNo, 10)
            inpString += numsPad(rec.Ksat, 10)
            inpString += numsPad(rec.DryTime, 10)
            break
        }

        inpString += '\n';
      }
      return inpString;
    },

    AQUIFERS: function(model) {
      let secStr = 'AQUIFERS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Por, 6)
        inpString += numsPad(rec.WP, 6)
        inpString += numsPad(rec.FC, 6)
        inpString += numsPad(rec.Ks, 6)
        inpString += numsPad(rec.Kslp, 6)
        inpString += numsPad(rec.Tslp, 6)
        inpString += numsPad(rec.ETu, 6)
        inpString += numsPad(rec.ETs, 6)
        inpString += numsPad(rec.Seep, 6)
        inpString += numsPad(rec.Ebot, 6)
        inpString += numsPad(rec.Egw, 6)
        inpString += numsPad(rec.Umc, 6)
        if(isValidData(rec.Epat))
          inpString += strsPad(rec.Epat, 11)

        inpString += '\n';
      }
      return inpString;
    },

    GROUNDWATER: function(model) {
      let secStr = 'GROUNDWATER'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Aquifer, 16)
        inpString += strsPad(rec.Node, 16)
        inpString += numsPad(rec.Esurf, 6)
        inpString += numsPad(rec.A1, 6)
        inpString += numsPad(rec.B1, 6)
        inpString += numsPad(rec.A2, 6)
        inpString += numsPad(rec.B2, 6)
        inpString += numsPad(rec.A3, 6)
        inpString += numsPad(rec.Dsw, 6)
        if(isValidData(rec.Egwt))
          inpString += strsPad(rec.Egwt, 11)
        if(isValidData(rec.Ebot))
          inpString += strsPad(rec.Ebot, 11)
        if(isValidData(rec.Egw))
          inpString += strsPad(rec.Egw, 11)
        if(isValidData(rec.Umc))
          inpString += strsPad(rec.Umc, 11)
        
        inpString += '\n';
      }
      return inpString;
    },

    GWF: function(model){
      let secStr = 'GWF'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        if(rec.DEEP) inpString += entry +' DEEP ' + rec.DEEP + '\n'
        if(rec.LATERAL) inpString += entry + ' LATERAL ' + rec.LATERAL + '\n'
      }

      return inpString
    },

    SNOWPACKS: function(model){
      let secStr = 'SNOWPACKS'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 16)
        inpString += strsPad('PLOWABLE', 16)
        inpString += numsPad(rec.FLOWABLE.Cmin, 10)
        inpString += numsPad(rec.FLOWABLE.Cmax, 10)
        inpString += numsPad(rec.FLOWABLE.Tbase, 10)
        inpString += numsPad(rec.FLOWABLE.FWF, 10)
        inpString += numsPad(rec.FLOWABLE.SD0, 10)
        inpString += numsPad(rec.FLOWABLE.FW0, 10)
        inpString += numsPad(rec.FLOWABLE.SNN0, 10)
        inpString +=   '\n'
        inpString += strsPad(entry, 16)
        inpString += strsPad('IMPERVIOUS', 16)
        inpString += numsPad(rec.IMPERVIOUS.Cmin, 10)
        inpString += numsPad(rec.IMPERVIOUS.Cmax, 10)
        inpString += numsPad(rec.IMPERVIOUS.Tbase, 10)
        inpString += numsPad(rec.IMPERVIOUS.FWF, 10)
        inpString += numsPad(rec.IMPERVIOUS.SD0, 10)
        inpString += numsPad(rec.IMPERVIOUS.FW0, 10)
        inpString += numsPad(rec.IMPERVIOUS.SD100, 10)
        inpString +=   '\n'
        inpString += strsPad(entry, 16)
        inpString += strsPad('PERVIOUS', 16)
        inpString += numsPad(rec.PERVIOUS.Cmin, 10)
        inpString += numsPad(rec.PERVIOUS.Cmax, 10)
        inpString += numsPad(rec.PERVIOUS.Tbase, 10)
        inpString += numsPad(rec.PERVIOUS.FWF, 10)
        inpString += numsPad(rec.PERVIOUS.SD0, 10)
        inpString += numsPad(rec.PERVIOUS.FW0, 10)
        inpString += numsPad(rec.PERVIOUS.SD100, 10)
        inpString +=   '\n'
        inpString += strsPad(entry, 16)
        inpString += strsPad('REMOVAL', 16)
        inpString += numsPad(rec.REMOVAL.Dplow, 10)
        inpString += numsPad(rec.REMOVAL.Fout, 10)
        inpString += numsPad(rec.REMOVAL.Fimp, 10)
        inpString += numsPad(rec.REMOVAL.Fperv, 10)
        inpString += numsPad(rec.REMOVAL.Fimelt, 10)
        inpString += numsPad(rec.REMOVAL.Fsub?rec.REMOVAL.Fsub:0, 10)
        inpString += strsPad(rec.REMOVAL.Scatch?rec.REMOVAL.Scatch:'', 10)
        inpString +=   '\n'
      }

      return inpString
    },

    JUNCTIONS: function(model) {
      let secStr = 'JUNCTIONS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Invert, 10)
        if(isValidData(rec.Dmax))
          inpString += numsPad(rec.Dmax, 10)
        if(isValidData(rec.Dinit))
          inpString += numsPad(rec.Dinit, 10)
        if(isValidData(rec.Dsurch))
          inpString += numsPad(rec.Dsurch, 10)
        if(isValidData(rec.Aponded))
          inpString += numsPad(rec.Aponded, 10)

        inpString += '\n';
      }
      return inpString;
    },
    
    OUTFALLS: function(model) {
      let secStr = 'OUTFALLS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Invert, 10)
        inpString += strsPad(rec.Type, 10)
        switch(rec.Type){
          case ('TIMESERIES'):
            inpString += strsPad(rec.Tseries, 16)
            break
          case ('TIDAL'):
            inpString += strsPad(rec.Tcurve, 16)
            break
          case ('FIXED'):
            inpString += numsPad(rec.StageData, 16)
            break
          case ('FREE'):
            inpString += strsPad(' ', 16)
            break
        }
        inpString += strsPad(rec.Gated, 10)
        inpString += strsPad(rec.RouteTo, 10)

        inpString += '\n';
      }
      return inpString;
    },

    STORAGE: function(model) {
      let secStr = 'STORAGE'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Elev, 10)
        inpString += numsPad(rec.Ymax, 10)
        inpString += numsPad(rec.Y0, 10)
        inpString += strsPad(rec.Curve, 16)
        switch(rec.Curve){
          case ('TABULAR'):
            inpString += strsPad(rec.CurveName, 16)
            break
          case ('FUNCTIONAL'):
            inpString += numsPad(rec.Coefficient, 10)
            inpString += numsPad(rec.Exponent, 10)
            inpString += numsPad(rec.Constant, 10)
            break
        }
        if(isValidData(rec.Aponded))
          inpString += numsPad(rec.Aponded, 10)
        if(isValidData(rec.Fevap))
          inpString += numsPad(rec.Fevap, 10)
        if(isValidData(rec.Psi))
          inpString += numsPad(rec.Psi, 10)
        if(isValidData(rec.Ksat))
          inpString += numsPad(rec.Ksat, 10)
        if(isValidData(rec.IMD))
          inpString += numsPad(rec.IMD, 10)

        inpString += '\n';
      }
      return inpString;
    },

    DIVIDERS: function(model) {
      let secStr = 'DIVIDERS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Elev, 10)
        inpString += strsPad(rec.DivLink, 16)
        inpString += strsPad(rec.Type, 10)
        switch(rec.Type){
          case ('OVERFLOW'):
            break
          case ('CUTOFF'):
            inpString += numsPad(rec.Qmin, 10)
            break
          case ('TABULAR'):
            inpString += strsPad(rec.Dcurve, 10)
            break
          case ('WEIR'):
            inpString += numsPad(rec.Qmin, 10)
            inpString += numsPad(rec.Ht, 10)
            inpString += numsPad(rec.Cd, 10)
            break
            
        }
        if(isValidData(rec.Ymax))
          inpString += numsPad(rec.Ymax, 10)
        if(isValidData(rec.Y0))
          inpString += numsPad(rec.Y0, 10)
        if(isValidData(rec.Ysur))
          inpString += numsPad(rec.Ysur, 10)
        if(isValidData(rec.Apond))
          inpString += numsPad(rec.Apond, 10)

        inpString += '\n';
      }
      return inpString;
    },

    //==
    CONDUITS: function(model) {
      let secStr = 'CONDUITS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Node1, 16)
        inpString += numsPad(rec.Node2, 16)
        inpString += numsPad(rec.Length, 10)
        inpString += numsPad(rec.Roughness, 10)
        inpString += numsPad(rec.InOffset, 10)
        inpString += numsPad(rec.OutOffset, 10)
        inpString += numsPad(rec.InitFlow, 10)

        if(isValidData(rec.MaxFlow))
          inpString += numsPad(rec.MaxFlow, 10)

        inpString += '\n';
      }
      return inpString;
    },

    //==
    PUMPS: function(model) {
      let secStr = 'PUMPS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Node1, 16)
        inpString += strsPad(rec.Node2, 16)
        inpString += strsPad(rec.Pcurve, 16)
        if(isValidData(rec.Status))
          inpString += strsPad(rec.Status, 10)
        if(isValidData(rec.Startup))
          inpString += numsPad(rec.Startup, 10)
        if(isValidData(rec.Status))
          inpString += numsPad(rec.Shutoff, 10)

        inpString += '\n';
      }
      return inpString;
    },

    //==
    ORIFICES: function(model) {
      let secStr = 'ORIFICES'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Node1, 16)
        inpString += strsPad(rec.Node2, 16)
        inpString += strsPad(rec.Type, 16)
        inpString += numsPad(rec.Offset, 10)
        inpString += numsPad(rec.Cd, 10)
        if(isValidData(rec.Gated))
          inpString += strsPad(rec.Gated, 10)
        if(isValidData(rec.Orate))
          inpString += numsPad(rec.Orate, 10)

        inpString += '\n';
      }
      return inpString;
    },

    //==
    WEIRS: function(model) {
      let secStr = 'WEIRS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Node1, 16)
        inpString += strsPad(rec.Node2, 16)
        inpString += strsPad(rec.Type, 16)
        inpString += numsPad(rec.CrestHt, 10)
        inpString += numsPad(rec.Cd, 10)
        if(isValidData(rec.Gated))
          inpString += strsPad(rec.Gated, 10)
        if(isValidData(rec.EC))
          inpString += numsPad(rec.EC, 10)
        if(isValidData(rec.Cd2))
          inpString += numsPad(rec.Cd2, 10)
        if(isValidData(rec.Surcharge))
          inpString += strsPad(rec.Surcharge, 10)
        if(isValidData(rec.Width))
          inpString += numsPad(rec.Width, 10)

        inpString += '\n';
      }
      return inpString;
    },

    OUTLETS: function(model) {
      let secStr = 'OUTLETS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Node1, 16)
        inpString += strsPad(rec.Node2, 16)
        inpString += numsPad(rec.Offset, 16)
        inpString += strsPad(rec.Type, 16)
        switch(rec.Type){
          case ('TABULAR/DEPTH'):
          case ('TABULAR/HEAD'):
            inpString += strsPad(rec.Qcurve, 16)
            break
          case ('FUNCTIONAL/DEPTH'):
          case ('FUNCTIONAL/HEAD'):
            inpString += numsPad(rec.C1, 10)
            inpString += numsPad(rec.C2, 10)
            break
        }
        if(isValidData(rec.Gated))
          inpString += numsPad(rec.Gated, 10)

        inpString += '\n';
      }
      return inpString;
    },

    XSECTIONS: function(model) {
      let secStr = 'XSECTIONS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        switch(rec.swmmType){
          case ('CUSTOM'):
            inpString += numsPad(rec.Geom1, 12)
            inpString += strsPad(rec.Curve, 48)
            inpString += numsPad(rec.Barrels, 10)
            break
          case ('IRREGULAR'):
            inpString += strsPad(rec.Tsect, 12)
            break
          case ('SHAPE'):
            inpString += strsPad(rec.Shape, 12)
            inpString += numsPad(rec.Geom1, 16)
            inpString += numsPad(rec.Geom2, 10)
            inpString += numsPad(rec.Geom3, 10)
            inpString += numsPad(rec.Geom4, 10)
            inpString += numsPad(rec.Barrels, 10)
            inpString += numsPad(rec.Culvert, 10)
            break
        }

        inpString += '\n';
      }
      return inpString;
    },

    TRANSECTS: function(model) {
      let secStr = 'TRANSECTS';
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad('NC', 4)
        inpString += numsPad(rec.Nleft, 10)
        inpString += numsPad(rec.Nright, 10)
        inpString += numsPad(rec.Nchanl, 10)
        inpString += '\n'
        inpString += strsPad('X1', 4)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.GR.length, 4)
        inpString += numsPad(rec.Xleft, 10)
        inpString += numsPad(rec.Xright, 10)
        inpString += numsPad(0, 3)
        inpString += numsPad(0, 3)
        inpString += numsPad(rec.Lfactor, 10)
        inpString += numsPad(rec.Wfactor, 10)
        inpString += numsPad(rec.Eoffset, 10)
        inpString += '\n'

        inpString += strsPad('GR', 4)
        for(let el in rec.GR){
          inpString += numsPad(rec.GR[el].Elev, 18)
          inpString += numsPad(rec.GR[el].Station, 18)
        }
        
        inpString += '\n'
      }
      return inpString;
    },

    //==
    LOSSES: function(model) {
      let secStr = 'LOSSES'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.Kin, 10)
        inpString += numsPad(rec.Kout, 10)
        inpString += numsPad(rec.Kavg, 10)
        if(isValidData(rec.Flap))
          inpString += strsPad(rec.Flap, 10)
        if(isValidData(rec.Seepage))
          inpString += numsPad(rec.Seepage, 10)

        inpString += '\n';
      }
      return inpString;
    },

    //==
    POLLUTANTS: function(model) {
      let secStr = 'POLLUTANTS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        // If there is a description, save it.
        inpString += validDescription(rec)
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Units, 6)
        inpString += numsPad(rec.Cppt, 10)
        inpString += numsPad(rec.Cgw, 10)
        inpString += numsPad(rec.Crdii, 10)
        inpString += numsPad(rec.Kdecay, 10)
        
        if(isValidData(rec.SnowOnly))
          inpString += strsPad(rec.SnowOnly, 10)
        if(isValidData(rec.CoPollutant))
          inpString += strsPad(rec.CoPollutant, 10)
        if(isValidData(rec.CoFrac))
          inpString += numsPad(rec.CoFrac, 10)
        if(isValidData(rec.Cdwf))
          inpString += numsPad(rec.Cdwf, 10)
        if(isValidData(rec.Cinit))
          inpString += numsPad(rec.Cinit, 10)

        inpString += '\n';
      }
      return inpString;
    },

   //==
   LANDUSES: function(model) {
    let secStr = 'LANDUSES'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      // If there is a description, save it.
      inpString += validDescription(rec)
      inpString += strsPad(entry, 16)
      
      if(isValidData(rec.Interval))
        inpString += strsPad(rec.Interval, 10)
      if(isValidData(rec.Available))
        inpString += strsPad(rec.Available, 10)
      if(isValidData(rec.Cleaned))
        inpString += strsPad(rec.Cleaned, 10)

      inpString += '\n';
    }
    return inpString;
  },
  
  //==
  COVERAGES: function(model) {
    let secStr = 'COVERAGES'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      for (let el in model[secStr][entry]){
        inpString += strsPad(entry, 16)
        if(isValidData(rec[el].LandUse))
          inpString += strsPad(rec[el].LandUse, 16)
        if(isValidData(rec[el].Percent))
          inpString += numsPad(rec[el].Percent, 10)

        inpString += '\n';
      }
    }
    return inpString;
  },

  INFLOWS: function(model) {
    let secStr = 'INFLOWS'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      // If there is a description, save it.
      inpString += validDescription(rec)
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec.Parameter, 16)
      inpString += strsPad(rec.Timeseries, 16)
      if(isValidData(rec.Type))
        inpString += strsPad(rec.Type, 10)
      if(isValidData(rec.UnitsFactor))
        inpString += numsPad(rec.UnitsFactor, 10)
      if(isValidData(rec.ScaleFactor))
        inpString += numsPad(rec.ScaleFactor, 10)
      if(isValidData(rec.Baseline))
        inpString += numsPad(rec.Baseline, 10)
      if(isValidData(rec.Pattern))
        inpString += strsPad(rec.Pattern, 10)

      inpString += '\n';
    }
    return inpString;
  },

  DWF: function(model) {
    let secStr = 'DWF'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      // If there is a description, save it.
      inpString += validDescription(rec)
      inpString += strsPad(entry, 16)
      inpString += numsPad(rec.Base, 10)
      if(isValidData(rec.Pat1))
        inpString += strsPad(rec.Pat1, 16)
      if(isValidData(rec.Pat2))
        inpString += strsPad(rec.Pat2, 16)
      if(isValidData(rec.Pat3))
        inpString += strsPad(rec.Pat3, 16)
      if(isValidData(rec.Pat4))
        inpString += strsPad(rec.Pat4, 16)

      inpString += '\n';
    }
    return inpString;
  },

  //==
  PATTERNS: function(model) {
    let secStr = 'PATTERNS'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec.Type, 10)

      for (let el in model[secStr][entry].Factors){
        inpString += numsPad(rec.Factors[el], 10)
      }
      inpString += '\n';
    }
    return inpString;
  },

  HYDROGRAPHS: function(model) {
    let secStr = 'HYDROGRAPHS'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      // If there is a description, save it.
      inpString += validDescription(rec)
      // Write out the Raingage line of the hydrograph
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec.Raingage, 16)
      inpString += '\n'

      // For each entry in the Months object, 
      // write out the data line for that entry
      for (let el in rec.Months){
        var mo = rec.Months[el]
        for (let ob in rec.Months[el]){
          inpString += strsPad(entry, 16)
          inpString += strsPad(el, 16)
          inpString += strsPad(ob, 16)
          inpString += numsPad(mo[ob].R, 10)
          inpString += numsPad(mo[ob].T, 10)
          inpString += numsPad(mo[ob].K, 10)
          if(isValidData(mo[ob].Dmax))
            inpString += numsPad(mo[ob].Dmax, 10)
          if(isValidData(mo[ob].Drec))
            inpString += numsPad(mo[ob].Drec, 10)
          if(isValidData(mo[ob].D0))
            inpString += numsPad(mo[ob].D0, 10)
          inpString += '\n'
        }
      }
    }
    return inpString;
  },
  
  RDII: function(model) {
    let secStr = 'RDII'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      // If there is a description, save it.
      inpString += validDescription(rec)
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec.UHgroup, 16)
      inpString += numsPad(rec.SewerArea, 10)

      inpString += '\n';
    }
    return inpString;
  },

  //==
  LOADINGS: function(model) {
    let secStr = 'LOADINGS'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      for (let el in model[secStr][entry]){
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec[el].Pollutant, 16)
        inpString += numsPad(rec[el].InitLoad, 16)
        inpString += '\n';
      }
    }
    return inpString;
  },

  //==
  CURVES: function(model) {
    let secStr = 'CURVES'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec.Type, 16)
      for (let el in model[secStr][entry].Curve){
        inpString += numsPad(rec.Curve[el].x, 10)
        inpString += numsPad(rec.Curve[el].y, 10)
      }
      inpString += '\n';
    }
    return inpString;
  },

  //==
  TREATMENT: function(model) {
    let secStr = 'TREATMENT'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      for (let el in model[secStr][entry]){
        inpString += strsPad(entry, 16)
        inpString += strsPad(el, 16)
        inpString += strsPad(rec[el], 10)
        inpString += '\n';
      }
    }
    return inpString;
  },

  //==
  BUILDUP: function(model) {
    let secStr = 'BUILDUP'
    let inpString = sectionCap(secStr)
    //
    for (let entry in model[secStr]) {
      var rec = model[secStr][entry]
      for (let el in model[secStr][entry]){
        
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec[el].Pollutant, 16)
        inpString += strsPad(rec[el].Function, 10)
        inpString += numsPad(rec[el].Coeff1, 10)
        inpString += numsPad(rec[el].Coeff2, 10)
        inpString += numsPad(rec[el].Coeff3, 10)
        inpString += strsPad(rec[el].Normalizer, 10)

        inpString += '\n';
      }
    }
    return inpString;
  },

 //==
 WASHOFF: function(model) {
  let secStr = 'WASHOFF'
  let inpString = sectionCap(secStr)
  //
  for (let entry in model[secStr]) {
    var rec = model[secStr][entry]
    for (let el in model[secStr][entry]){
      inpString += strsPad(entry, 16)
      inpString += strsPad(rec[el].Pollutant, 16)
      inpString += strsPad(rec[el].Function, 10)
      inpString += numsPad(rec[el].Coeff1, 10)
      inpString += numsPad(rec[el].Coeff2, 10)
      inpString += numsPad(rec[el].Ecleaning, 10)
      inpString += strsPad(rec[el].Ebmp, 10)

      inpString += '\n';
    }
  }
  return inpString;
},

    //==
    TIMESERIES: function(model) {
      const secStr = 'TIMESERIES'
      var inpString = sectionCap(secStr)  
      // For every timeseries
      for (let entry in model[secStr]) {
        // For every element of the timeseries
        for(let el in model[secStr][entry]){
          var thisData = model[secStr][entry][el]
          // Check for the format of the object:
          var format = getTimeseriesFormat(thisData)

          inpString += strsPad(entry, 16)
          switch(format){
            // file formatted object
            case 'file':
              inpString += strsPad('FILE', 15)
              inpString += strsPad(thisData, 11)
              break
          // date formatted object
            case 'date':
              inpString += strsPad(thisData.Date, 15)
              inpString += numsPad(thisData.Value, 11)
              break
          // time formatted object
            case 'time':
              inpString += numsPad(thisData.Time, 15)
              inpString += numsPad(thisData.Value, 11)
              break
          }

          inpString += '\n';
        }
      }
      return inpString;
    },

    CONTROLS: function(model) {
      let secStr = 'CONTROLS'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad('RULE', 4)
        inpString += strsPad(entry, 16)
        inpString += '\n';
        if(Array.isArray(rec)){
          for(let el in rec){
            inpString += strsPad(rec[el], 0)
            inpString += '\n';
          }
        } 
      }
      return inpString;
    },

    REPORT: function(model) {
      let secStr = 'REPORT'
      let inpString = sectionCap(secStr)
      //
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 21)
        if(Array.isArray(rec)){
          for(let el in rec){
            inpString += strsPad(rec[el], 0)
          }
        } else {
          inpString += strsPad(rec, 17)
        }
        inpString += '\n';
      }
      return inpString;
    },

    MAP: function(model) {
      let secStr = 'MAP'
      let inpString = sectionCap(secStr)
      //
      inpString += strsPad('DIMENSIONS', 21)
      inpString += numsPad(model[secStr].DIMENSIONS.x1, 10)
      inpString += numsPad(model[secStr].DIMENSIONS.y1, 10)
      inpString += numsPad(model[secStr].DIMENSIONS.x2, 10)
      inpString += numsPad(model[secStr].DIMENSIONS.y2, 10)
      
      inpString += '\n';
      return inpString;
    },

    COORDINATES: function(model) {
      let secStr = 'COORDINATES';
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.x, 18)
        inpString += numsPad(rec.y, 18)
        inpString += '\n';
      }
      return inpString;
    },

    VERTICES: function(model) {
      let secStr = 'VERTICES';
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        for(let el in rec){
          inpString += strsPad(entry, 16)
          inpString += numsPad(rec[el].x, 18)
          inpString += numsPad(rec[el].y, 18)
          inpString += '\n';
        }
      }
      return inpString;
    },

    Polygons: function(model) {
      let secStr = 'Polygons';
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        for(let el in rec){
          inpString += strsPad(entry, 16)
          inpString += numsPad(rec[el].x, 18)
          inpString += numsPad(rec[el].y, 18)
          inpString += '\n';
        }
      }
      return inpString;
    },

    SYMBOLS: function(model) {
      let secStr = 'SYMBOLS';
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 16)
        inpString += numsPad(rec.x, 18)
        inpString += numsPad(rec.y, 18)
        inpString += '\n';
      }
      return inpString;
    },

    LABELS: function(model) {
      let secStr = 'LABELS'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += numsPad(rec.x, 10)
        inpString += numsPad(rec.y, 10)
        inpString += strsPad(rec.Label, 16)
        inpString += strsPad(rec.Attrs, 16)
        inpString += '\n'
      }
      return inpString
    },

    BACKDROP: function(model) {
      let secStr = 'BACKDROP'
      let inpString = sectionCap(secStr)

      if (!isValidData(model['BACKDROP'].File)){ return inpString}
      var rec = model[secStr]
        
      inpString += strsPad('FILE', 6)
      inpString += strsPad(rec.File, 16)
      inpString += '\n';

      inpString += strsPad('DIMENSIONS', 12)
      inpString += numsPad(rec.x1, 10)
      inpString += numsPad(rec.y1, 10)
      inpString += numsPad(rec.x2, 10)
      inpString += numsPad(rec.y2, 10)
      inpString += '\n';

      return inpString
    },

    TAGS: function(model) {
      let secStr = 'TAGS'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(rec.Type, 16)
        inpString += strsPad(rec.ID, 16)
        inpString += strsPad(rec.Tag, 16)
        inpString += '\n'
      }
      return inpString
    },

    LID_CONTROLS: function(model) {
      let secStr = 'LID_CONTROLS'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        inpString += strsPad(entry, 16)
        inpString += strsPad(rec.Type, 3)
        inpString += '\n'
        if(isValidData(rec.SURFACE)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('SURFACE', 10)
          inpString += numsPad(rec.SURFACE.StorHt, 10)
          inpString += numsPad(rec.SURFACE.VegFrac, 10)
          inpString += numsPad(rec.SURFACE.Rough, 10)
          inpString += numsPad(rec.SURFACE.Slope, 10)
          inpString += numsPad(rec.SURFACE.Xslope, 10)
          inpString += '\n'
        }
        if(isValidData(rec.SOIL)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('SOIL', 10)
          inpString += numsPad(rec.SOIL.Thick, 10)
          inpString += numsPad(rec.SOIL.Por, 10)
          inpString += numsPad(rec.SOIL.FC, 10)
          inpString += numsPad(rec.SOIL.WP, 10)
          inpString += numsPad(rec.SOIL.Ksat, 10)
          inpString += numsPad(rec.SOIL.Kcoeff, 10)
          inpString += numsPad(rec.SOIL.Suct, 10)
          inpString += '\n'
        }
        if(isValidData(rec.PAVEMENT)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('PAVEMENT', 10)
          inpString += numsPad(rec.PAVEMENT.Thick, 10)
          inpString += numsPad(rec.PAVEMENT.Vratio, 10)
          inpString += numsPad(rec.PAVEMENT.FracImp, 10)
          inpString += numsPad(rec.PAVEMENT.Perm, 10)
          inpString += numsPad(rec.PAVEMENT.Vclog, 10)
          inpString += '\n'
        }
        if(isValidData(rec.STORAGE)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('STORAGE', 10)
          inpString += numsPad(rec.STORAGE.Height, 10)
          inpString += numsPad(rec.STORAGE.Vratio, 10)
          inpString += numsPad(rec.STORAGE.Seepage, 10)
          inpString += numsPad(rec.STORAGE.Vclog, 10)
          inpString += '\n'
        }
        if(isValidData(rec.DRAIN)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('DRAIN', 10)
          inpString += numsPad(rec.DRAIN.Coeff, 10)
          inpString += numsPad(rec.DRAIN.Expon, 10)
          inpString += numsPad(rec.DRAIN.Offset, 10)
          inpString += numsPad(rec.DRAIN.Delay, 10)
          inpString += numsPad(rec.DRAIN.Open, 10)
          inpString += numsPad(rec.DRAIN.Close, 10)
          inpString += strsPad(rec.DRAIN.Curve, 16)
          inpString += '\n'
        }
        if(isValidData(rec.DRAINMAT)){
          inpString += strsPad(entry, 16)
          inpString += strsPad('DRAINMAT', 10)
          inpString += numsPad(rec.DRAINMAT.Thick, 10)
          inpString += numsPad(rec.DRAINMAT.Vratio, 10)
          inpString += numsPad(rec.DRAINMAT.Rough, 10)
          inpString += '\n'
        }
      }
      return inpString;
    },

    LID_USAGE: function(model) {
      let secStr = 'LID_USAGE'
      let inpString = sectionCap(secStr)
      for (let entry in model[secStr]) {
        var rec = model[secStr][entry]
        for (let entry2 in rec){
          let rec2 = rec[entry2]
          inpString += strsPad(entry, 16)
          inpString += strsPad(entry2, 16)
          inpString += numsPad(rec2.Number, 7)
          inpString += numsPad(rec2.Area, 10)
          inpString += numsPad(rec2.Width, 10)
          inpString += numsPad(rec2.InitSat, 10)
          inpString += numsPad(rec2.FromImp, 10)
          inpString += numsPad(rec2.ToPerv, 10)
          if(isValidData(rec2.RptFile))
            inpString += strsPad(rec2.RptFile, 24)
          if(isValidData(rec2.DrainTo))
            inpString += strsPad(rec2.DrainTo, 16)
          if(isValidData(rec2.FromPerv))
            inpString += numsPad(rec2.FromPerv, 10)
          
          inpString += '\n'
        }
      }
      return inpString
    },
  }

  // getTimeseriesFormat
  // Identifies the format of a given timeseries object
  function getTimeseriesFormat(timeseriesObject){
    if(!isValidData(timeseriesObject))
      return 'invalid'
    if(isValidData(timeseriesObject.Date))
      return 'date'
    if(isValidData(timeseriesObject.Time))
      return 'time'
    else
      return 'file'
  }

  // numsPad
  // takes a number and a pad length and translates it and pads it,
  // with an extra space at the end.
  function numsPad(number, padLength){
    return number.toString().padEnd(padLength, ' ') + ' '
  }

  // stringsPad
  // takes a string and a pad length and pads it,
  // with an extra space at the end.
  function strsPad(data, padLength){
    return data.padEnd(padLength, ' ') + ' '
  }

  // sectionCap
  // returns a divider between the section header and the contents.
  // This should be variable depending upon section type.
  function sectionCap(section){
    var thisStr = ''
    if(isValidData(section)){
      if(section == 'LID_USAGE')
        thisStr += '[LID_USAGE]\n;;Subcatchment   LID Process      Number  Area       Width      InitSat    FromImp    ToPerv     RptFile                  DrainTo          FromPerv  \n'
      if(section == 'LID_CONTROLS')
        thisStr += '[LID_CONTROLS]\n;;Name           Type/Layer Parameters\n'
      if(section == 'TAGS')
        thisStr += '[TAGS]\n'
      if(section == 'BACKDROP')
        thisStr += '[BACKDROP]\n'
      if(section == 'LABELS')
        thisStr += '[LABELS]\n;;X-Coord          Y-Coord            Label           \n'
      if(section == 'CONTROLS')
        thisStr += '[CONTROLS]\n'
      if(section == 'CURVES')
        thisStr += '[CURVES]\n;;Name           Type       X-Value    Y-Value   \n'
      if(section == 'TREATMENT')
        thisStr += '[TREATMENT]\n;;Node           Pollutant        Function  \n'
      if(section == 'LOADINGS')
        thisStr += '[LOADINGS]\n;;Subcatchment   Pollutant        Buildup   \n'
      if(section == 'HYDROGRAPHS')
        thisStr += '[HYDROGRAPHS]\n;;Hydrograph     Rain Gage/Month  Response R        T        K        Dmax     Drecov   Dinit   \n'
      if(section == 'RDII')
        thisStr += '[RDII]\n;;Node           Unit Hydrograph  Sewer Area\n'
      if(section == 'PATTERNS')
        thisStr += '[PATTERNS]\n;;Name           Type       Multipliers\n'
      if(section == 'DWF')
        thisStr += '[DWF]\n;;Node           Constituent      Baseline   Patterns  \n'
      if(section == 'INFLOWS')
        thisStr += '[INFLOWS]\n;;Node           Constituent      Time Series      Type     Mfactor  Sfactor  Baseline Pattern\n'
      if(section == 'LOSSES')
        thisStr += '[LOSSES]\n;;Link           Kentry     Kexit      Kavg       Flap Gate  Seepage   \n'
      if(section == 'TRANSECTS')
        thisStr += '[TRANSECTS]\n;;Transect Data in HEC-2 format\n'
      if(section == 'OUTLETS')
        thisStr += '[OUTLETS]\n;;Name           From Node        To Node          Offset     Type            QTable/Qcoeff    Qexpon     Gated   \n'
      if(section == 'WEIRS')
        thisStr += '[WEIRS]\n;;Name           From Node        To Node          Type         CrestHt    Qcoeff     Gated    EndCon   EndCoeff   Surcharge  RoadWidth  RoadSurf   Coeff. Curve\n'
      if(section == 'ORIFICES')
        thisStr += '[ORIFICES]\n;;Name           From Node        To Node          Type         Offset     Qcoeff     Gated    CloseTime \n'
      if(section == 'PUMPS')
        thisStr += '[PUMPS]\n;;Name           From Node        To Node          Pump Curve       Status   Sartup Shutoff \n'
      if(section == 'DIVIDERS')
        thisStr += '[DIVIDERS]\n;;Name           Elevation  Diverted Link    Type       Parameters\n'
      if(section == 'STORAGE')
        thisStr += '[STORAGE]\n;;Name           Elev.    MaxDepth   InitDepth  Shape      Curve Name/Params            N/A      Fevap    Psi      Ksat     IMD     \n'
      if(section == 'SNOWPACKS')
        thisStr += '[SNOWPACKS]\n;;Name           Surface    Parameters\n'
      if(section == 'GWF')
        thisStr += '[GWF]\n;;Subcatchment   Flow    Equation\n'
      if(section == 'GROUNDWATER')
        thisStr += '[GROUNDWATER]\n;;Subcatchment   Aquifer          Node             Esurf  A1     B1     A2     B2     A3     Dsw    Egwt   Ebot   Wgr    Umc        \n'
      if(section == 'AQUIFERS')
        thisStr += '[AQUIFERS]\n;;Name           Por    WP     FC     Ksat   Kslope Tslope ETu    ETs    Seep   Ebot   Egw    Umc    ETupat \n'
      if(section == 'TEMPERATURE')
        thisStr += '[TEMPERATURE]\n;;Data Element     Values     \n'
      if(section == 'SYMBOLS')
        thisStr += '[SYMBOLS]\n;;Gage           X-Coord            Y-Coord           \n'
      if(section == 'Polygons')
        thisStr += '[Polygons]\n;;Subcatchment   X-Coord            Y-Coord           \n'
      if(section == 'VERTICES')
        thisStr += '[VERTICES]\n;;Link           X-Coord            Y-Coord           \n'
      if(section == 'MAP')
        thisStr += '[MAP]\n'
      if(section == 'REPORT')
        thisStr += '[REPORT]\n;;Reporting Options    \n'
      if(section == 'WASHOFF')
        thisStr += '[WASHOFF]\n;;Land Use       Pollutant        Function   Coeff1     Coeff2     Ecleaning  Ebmp      \n'   
      if(section == 'BUILDUP')
        thisStr += '[BUILDUP]\n;;Land Use       Pollutant        Function   Coeff1     Coeff2     Coeff3     Normalizer\n '
      if(section == 'COVERAGES')
        thisStr += '[COVERAGES]\n;;Subcatchment   Land Use         Percent   \n'
      if(section == 'LANDUSES')
        thisStr += '[LANDUSES]\n;;               Cleaning   Fraction   Last      \n;;Land Use       Interval   Available  Cleaned   \n'
      if(section == 'POLLUTANTS')
        thisStr += '[POLLUTANTS]\n;;Pollutant      Units  Cppt       Cgw        Crdii      Kdecay     SnowOnly   Co-Pollutant     Co-Frac    Cdwf       Cinit     \n'
      if(section == 'INFILTRATION')
        thisStr += '[INFILTRATION]\n;;Subcatchment   MaxRate    MinRate    Decay      DryTime    MaxInfil   \n'
      if(section == 'SUBAREAS')
        thisStr += '[SUBAREAS]\n;;Subcatchment   N-Imperv   N-Perv     S-Imperv   S-Perv     PctZero    RouteTo    PctRouted \n'
      if(section == 'SUBCATCHMENTS')
        thisStr += '[SUBCATCHMENTS]\n;;Subcatchment   Rain Gage        Outlet           Area     %Imperv  Width    %Slope   CurbLen  Snow Pack        \n'
      if(section == 'XSECTIONS')
        thisStr += '[XSECTIONS]\n;;Link           Shape        Geom1            Geom2      Geom3      Geom4      Barrels   \n'
      if(section == 'EVAPORATION')
        thisStr += '[EVAPORATION]\n;;Evap Data      Parameters    \n'
      if(section == 'COORDINATES')
        thisStr += '[COORDINATES]\n;;Node           X-Coord            Y-Coord           \n'
      if(section == 'OUTFALLS')
        thisStr += '[OUTFALLS]\n;;Outfall        Invert     Type       Stage Data       Gated   \n'
      if(section == 'CONDUITS')
        thisStr += '[CONDUITS]\n;;Conduit        From Node        To Node          Length     Roughness  InOffset   OutOffset  InitFlow   MaxFlow   \n'   
      if(section == 'TIMESERIES')
        thisStr += '[TIMESERIES]\n;;Time Series    Date/Time       Value     \n'   
      if(section == 'RAINGAGES')
        thisStr += '[RAINGAGES]\n;;Gage           Format    Interval SCF      Source\n'   
      if(section == 'OPTIONS')
        thisStr += '[OPTIONS]\n;;Option             Value\n'
      if(section == 'JUNCTIONS')
        thisStr += '[JUNCTIONS]\n;;Junction       Invert     Dmax       Dinit      Dsurch     Aponded   \n'
      
    }
    thisStr += ';;------------------------------------------------------------------------------------------------------------------\n'
    
    return thisStr
  }

  

  // Get a valid description string from an object.
  function validDescription(data){
    if(isValidData(data.Description)){
      if (data.Description.length > 0){
        return ';' + data.Description + '\n';
      } 
    }
    return '';
  }
  

  // This is a function that accepts a model section key and
  // returns a string that can be output into an .inp
  // file. This is a temporary function to take care of 
  // sections I haven't implemented yet.
  function secToStr(model, key){
    let thisString = '['+ key + ']\n'
    
    if (model[key]){
      model[key].forEach((val, i)=>{
        thisString += val + '\n';
      })
    }

    return thisString
  }

  // Loop through each of the keys of the
  // contents of the model.
  // This should remain in place even after I've covered all
  // the sections to assist in
  // translation and future compatibility.
  let validSecArray = ['TITLE',           'OPTIONS',      'RAINGAGES', 
                        'TEMPERATURE',    'EVAPORATION', 
                        'SUBCATCHMENTS',  'SUBAREAS',     'INFILTRATION', 
                        'AQUIFERS',       'GROUNDWATER',  'GWF', 
                        'SNOWPACKS',      'JUNCTIONS',    'OUTFALLS', 
                        'STORAGE',        'DIVIDERS',     'CONDUITS', 
                        'PUMPS',          'ORIFICES',     'WEIRS',
                        'OUTLETS',        'XSECTIONS',    'TRANSECTS', 
                        'LOSSES',         'POLLUTANTS',   'LANDUSES', 
                        'BUILDUP',        'WASHOFF',      'TREATMENT',
                        'COVERAGES',      'INFLOWS',      'DWF',          
                        'PATTERNS',       'HYDROGRAPHS',  'RDII',         
                        'LOADINGS',       'CURVES',       'TIMESERIES',
                        'CONTROLS',       'REPORT',       'MAP',
                        'COORDINATES',    'VERTICES',     'Polygons', 
                        'SYMBOLS',        'LABELS',       'BACKDROP',
                        'TAGS',           'LID_CONTROLS', 'LID_USAGE'
                      ]

  // There should also be an array sorted in the order of the
  // sections as they need to be written to the file. For example,
  // if you load the conduits before you load nodes, the system 
  // will throw a fail.
  let knownSecArray = [   // Input file model variables. Related to a header in .inp file.
    "TITLE",              "OPTIONS",            "RAINGAGES",
    "TEMPERATURE",        "EVAPORATION",        
    "SUBCATCHMENTS",      "SUBAREAS",           "INFILTRATION",
    "AQUIFERS",           "GROUNDWATER",        "GWF",
    "SNOWPACKS",          "JUNCTIONS",          "OUTFALLS",
    "STORAGE",            "DIVIDERS",           "CONDUITS",
    "PUMPS",              "ORIFICES",           "WEIRS",
    "OUTLETS",            "XSECTIONS",          "TRANSECTS",
    "LOSSES",             "POLLUTANTS",         "LANDUSES",
    "BUILDUP",            "WASHOFF",            "COVERAGES",
    "INFLOWS",            "DWF",                "PATTERNS",
    "HYDROGRAPHS",        "RDII",               "LOADINGS",
    "TREATMENT",          "CURVES",             "TIMESERIES",
    "CONTROLS",           "REPORT",             "MAP",
    "COORDINATES",        "VERTICES",           "Polygons",
    "SYMBOLS",            "LABELS",             "BACKDROP",
    "TAGS",               "PROFILE",            "FILE",
    "LID_CONTROLS",       "LID_USAGE",          "EVENT"
  ]

  // Now toss the array at the object. For each element of the array,
  // look for that element in the object. If there is an element of that 
  // kind associated with the model, write out the results to
  // the file.
  // Keep in mind we are now using arrays for unkeyed entries, instead
  // of creating keys for them. There is currently no need to create
  // and manage keys for those objects.
  knownSecArray.forEach((element, index) => {
    if(validSecArray.includes(element)){
      fullString += parser[element](model) + '\n';
    } else {
      // This is the portion that handles unknown sections. Let's use
      // these as arrays so we dont create and manage keys.
      // 
      if(model[element].length > 0)
        fullString += secToStr(model, element) + '\n'
    }
  })

  return fullString;
}

// Read SWMM binary result files
swmmresult = function() {
  function swmmresult() { }

  const SUBCATCH = 0,
      NODE     = 1,
      LINK     = 2,
      SYS      = 3,
      POLLUT   = 4,
      RECORDSIZE = 4;                       // number of bytes per file record

  TYPECODE = { // not used
      0: {1: 'Area'},
      1: {0: 'Junction',
          1: 'Outfall',
          2: 'Storage',
          3: 'Divider'},
      2: {0: 'Conduit',
          1: 'Pump',
          2: 'Orifice',
          3: 'Weir',
          4: 'Outlet'}
  };
          
  swmmresult.VARCODE = { 
      0: {0: 'Rainfall',
          1: 'Snow_depth',
          2: 'Evaporation_loss',
          3: 'Infiltration_loss',
          4: 'Runoff_rate',
          5: 'Groundwater_outflow',
          6: 'Groundwater_elevation',
          7: 'Soil_moisture',
          8: 'Pollutant_washoff'},
      1: {0: 'Depth_above_invert',
          1: 'Hydraulic_head',
          2: 'Volume_stored_ponded',
          3: 'Lateral_inflow',
          4: 'Total_inflow',
          5: 'Flow_lost_flooding'},
      2: {0: 'Flow_rate',
          1: 'Flow_depth',
          2: 'Flow_velocity',
          3: 'Froude_number',
          4: 'Capacity'},
      4: {0: 'Air_temperature',
          1: 'Rainfall',
          2: 'Snow_depth',
          3: 'Evaporation_infiltration',
          4: 'Runoff',
          5: 'Dry_weather_inflow',
          6: 'Groundwater_inflow',
          7: 'RDII_inflow',
          8: 'User_direct_inflow',
          9: 'Total_lateral_inflow',
          10: 'Flow_lost_to_flooding',
          11: 'Flow_leaving_outfalls',
          12: 'Volume_stored_water',
          13: 'Evaporation_rate',
          14: 'Potential_PET'}
  };
  
  _SWMM_FLOWUNITS = { // not used
          0: 'CFS',
          1: 'GPM',
          2: 'MGD',
          3: 'CMS',
          4: 'LPS',
          5: 'LPD'
  };    
  
  swmmresult.parse = function(c, size) {
    var r = {},
    er = swmmresult;
      
    this.offsetOID = 0;

    this.SWMM_Nperiods = 0,              // number of reporting periods
    this.SWMM_FlowUnits = 0,             // flow units code
    this.SWMM_Nsubcatch = 0,             // number of subcatchments
    this.SWMM_Nnodes = 0,                // number of drainage system nodes
    this.SWMM_Nlinks = 0,                // number of drainage system links
    this.SWMM_Npolluts = 0,              // number of pollutants tracked
    this.SWMM_StartDate = new Date(),    // start date of simulation
    this.SWMM_ReportStep = 0;            // reporting time step (seconds)	
    
    this.SubcatchVars = 0,               // number of subcatch reporting variable
    this.NodeVars = 0,                   // number of node reporting variables
    this.LinkVars = 0,                   // number of link reporting variables
    this.SysVars = 0,                    // number of system reporting variables
    this.StartPos = 0,                   // file position where results start
    this.BytesPerPeriod = 0;             // bytes used for results in each period
    
    var
        magic1, magic2, errCode, version;
    var
        offset, offset0;
        
    var stat = null;
    
    try {
        if (c)
            stat = c.byteLength//stat = FS.stat(filename);
    } catch (e) {
        stat = size || "undefined";
        console.log(e);
    }
    
    if (stat) {
        var size = (stat.size ? stat.size : stat);
        if (size < 14*RECORDSIZE) {
            return 1;
        }
        this.offsetOID = er.readInt(c, size-6*RECORDSIZE, RECORDSIZE);
        offset0 = er.readInt(c, size-5*RECORDSIZE, RECORDSIZE);
        this.StartPos = er.readInt(c, size-4*RECORDSIZE, RECORDSIZE);
        this.SWMM_Nperiods = er.readInt(c, size-3*RECORDSIZE, RECORDSIZE);
        errCode = er.readInt(c, size-2*RECORDSIZE, RECORDSIZE);
        magic2 = er.readInt(c, size-RECORDSIZE, RECORDSIZE);
        magic1 = er.readInt(c, 0, RECORDSIZE);
        
        if (magic1 !== magic2) return 1;
        else if (errCode !== 0) return 1;
        else if (this.SWMM_Nperiods===0) return 1;
        
        version = er.readInt(c, RECORDSIZE, RECORDSIZE);
        this.SWMM_FlowUnits = er.readInt(c, 2*RECORDSIZE, RECORDSIZE);
        this.SWMM_Nsubcatch = er.readInt(c, 3*RECORDSIZE, RECORDSIZE);
        this.SWMM_Nnodes = er.readInt(c, 4*RECORDSIZE, RECORDSIZE);
        this.SWMM_Nlinks = er.readInt(c, 5*RECORDSIZE, RECORDSIZE);
        this.SWMM_Npolluts = er.readInt(c, 6*RECORDSIZE, RECORDSIZE);
        
        // Skip over saved subcatch/node/link input values
        offset = (this.SWMM_Nsubcatch+2) * RECORDSIZE     // Subcatchment area
                    + (3*this.SWMM_Nnodes+4) * RECORDSIZE  // Node type, invert & max depth
                    + (5*this.SWMM_Nlinks+6) * RECORDSIZE; // Link type, z1, z2, max depth & length
        offset = offset0 + offset;

        this.SubcatchVars = er.readInt(c, offset, RECORDSIZE);
        this.NodeVars = er.readInt(c, offset + (this.SubcatchVars*RECORDSIZE), RECORDSIZE);
        this.LinkVars = er.readInt(c, offset + (this.SubcatchVars*RECORDSIZE) + (this.NodeVars*RECORDSIZE), RECORDSIZE);
        this.SysVars = er.readInt(c, offset + (this.SubcatchVars*RECORDSIZE) + (this.NodeVars*RECORDSIZE) + (this.LinkVars*RECORDSIZE), RECORDSIZE);
        
        offset = this.StartPos - 3*RECORDSIZE;
        var days = (er.readInt(c, offset, 2*RECORDSIZE)+1);
        this.SWMM_StartDate = new Date('12/31/1899');
        this.SWMM_StartDate = new Date(this.SWMM_StartDate.setDate(this.SWMM_StartDate.getDate() + days));
        this.SWMM_ReportStep = er.readInt(c, offset + 2*RECORDSIZE, RECORDSIZE);
        
        this.SubcatchVars = (8 + this.SWMM_Npolluts);
        this.NodeVars = (6 + this.SWMM_Npolluts);
        this.LinkVars = (5 + this.SWMM_Npolluts);
        this.SysVars = 15;
        
        this.BytesPerPeriod = RECORDSIZE*(2 + 
                this.SWMM_Nsubcatch*this.SubcatchVars +
                this.SWMM_Nnodes*this.NodeVars +
                this.SWMM_Nlinks*this.LinkVars +
                this.SysVars); 
        
        var variables = {};
        var nr = this.offsetOID;
        // Object names
        var subcatch = {}, node = {}, link = {}, pollut = {};
        for (var i =0; i< this.SWMM_Nsubcatch; i++) {
            var no = er.readInt(c, nr, RECORDSIZE);
            subcatch[i] = [ intArrayToString(new Uint8Array(c.slice(nr+RECORDSIZE, nr +RECORDSIZE+ no))) ]
            nr = nr + no + RECORDSIZE;
        }
        variables['SUBCATCH'] = {};
        variables['SUBCATCH']['items'] = subcatch;
        
        for (var i =0; i< this.SWMM_Nnodes; i++) {
            var no = er.readInt(c, nr, RECORDSIZE);
            node[i] = [ intArrayToString(new Uint8Array(c.slice(nr+RECORDSIZE, nr +RECORDSIZE+ no))) ]
            nr = nr + no + RECORDSIZE;
        }
        variables['NODE'] = {};
        variables['NODE']['items'] = node;
        
        for (var i =0; i< this.SWMM_Nlinks; i++) {
          // no: the count of characters in the string
            var no = er.readInt(c, nr, RECORDSIZE)
            link[i] = [ intArrayToString(new Uint8Array(c.slice(nr+RECORDSIZE, nr +RECORDSIZE+ no))) ]
            nr = nr + no + RECORDSIZE
        }
        variables['LINK'] = {};
        variables['LINK']['items'] = link;
        
        for (var i =0; i< this.SWMM_Npolluts; i++) {
            var no = er.readInt(c, nr, RECORDSIZE);
            pollut[i] = [ intArrayToString(new Uint8Array(c.slice(nr+RECORDSIZE, nr +RECORDSIZE+ no))) ]
            nr = nr + no + RECORDSIZE;
        }
        variables['POLLUT'] = {};
        variables['POLLUT']['items'] = pollut;
        
        while (nr<offset0) {
            var nm = er.readInt(c, nr, RECORDSIZE);
            variables.nm = nm;
            nr = nr + RECORDSIZE;
        }
        // Object properties
        nr = offset0;
        
        var vals = [];
        
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        variables['SUBCATCH']['init'] = vals;
        
        vals = [];
        for (var i =0; i< this.SWMM_Nsubcatch; i++) {
            var no = er.readInt(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            vals.push(no);
        }
        variables['SUBCATCH']['properties'] = vals;
        
        vals = [];
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        variables['NODE']['init'] = vals;
        
        vals = [];
        for (var i =0; i< this.SWMM_Nnodes; i++) {
            var el = {};
            var val = [];
            var no = er.readInt(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            el[variables['NODE']['items'][i]] = val;
            vals.push(el);
        }
        variables['NODE']['properties'] = vals;

        vals = [];
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        no = er.readInt(c, nr, RECORDSIZE);
        nr = nr + RECORDSIZE;
        vals.push(no);
        variables['LINK']['init'] = vals;

        vals = [];
        for (var i =0; i< this.SWMM_Nlinks; i++) {
            var el = {};
            var val = [];
            var no = er.readInt(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            no = er.readFloat(c, nr, RECORDSIZE);
            nr = nr + RECORDSIZE;
            val.push(no);
            el[variables['LINK']['items'][i]] = val;
            vals.push(el);
        }
        variables['LINK']['properties'] = vals;
        
        r['objects'] = variables;
        
        //reporting variables - 
        //SubcatchVars = 8;
        //NodeVars = 6;
        //LinkVars = 5;
        this.StartPosResult = this.StartPos;
        for (var i = 1; i <= this.SWMM_Nperiods; i++) {
            r[i] = {};
            var no = undefined;
            var vals = {};
            var el = [];
            
            this.StartPosResult += 2*RECORDSIZE;
            
            for (var j = 0; j < this.SWMM_Nsubcatch; j++) {
                el = [];
                for (var k = 0; k < this.SubcatchVars ; k++) { //2 = 1 number of subcatchment variables + 1 pollutants
                    no = er.getswmmresultoffset(SUBCATCH, j, k, i);
                    el.push(er.readFloat(c, no, RECORDSIZE));
                }
                vals[variables['SUBCATCH']['items'][j]] = el;
            }
            r[i]['SUBCATCH'] = vals;

            vals = {};
            for (var j = 0; j <  this.SWMM_Nnodes; j++) {
                el = [];
                for (var k = 0; k < this.NodeVars; k++) {
                    no = er.getswmmresultoffset(NODE, j, k, i);
                    el.push(er.readFloat(c, no, RECORDSIZE));
                }
                vals[variables['NODE']['items'][j]] = el;
            }
            r[i]['NODE'] = vals;

            vals = {};
            for (var j = 0; j <  this.SWMM_Nlinks; j++) {
                el = [];
                for (var k = 0; k < this.LinkVars; k++) {
                    no = er.getswmmresultoffset(LINK, j, k, i);
                    el.push(er.readFloat(c, no, RECORDSIZE));
                }
                vals[variables['LINK']['items'][j]] = el;
            }
            r[i]['LINK'] = vals;

            vals = {};
            el = [];
            for (var k = 0; k < this.SysVars; k++) {
                no = er.getswmmresultoffset(SYS, j, k, i);
                el.push(er.readFloat(c, no, RECORDSIZE));
            }
            r[i]['SYS'] = el;

            this.StartPosResult = no + RECORDSIZE;
        }
    }
    
    return r;
  };

  swmmresult.getswmmresultoffset = function(iType, iIndex, vIndex, period ) {
      var offset1, offset2;
      offset1 = this.StartPosResult; // + (period-1)*this.BytesPerPeriod + 2*RECORDSIZE;
      
      if ( iType === SUBCATCH ) 
        offset2 = (iIndex*(this.SubcatchVars) + vIndex);
      else if (iType === NODE) 
        offset2 = (this.SWMM_Nsubcatch*this.SubcatchVars + iIndex*this.NodeVars + vIndex);
      else if (iType === LINK)
        offset2 = (this.SWMM_Nsubcatch*this.SubcatchVars + this.SWMM_Nnodes*this.NodeVars + iIndex*this.LinkVars + vIndex);
      else if (iType === SYS) 
          offset2 = (this.SWMM_Nsubcatch*this.SubcatchVars + this.SWMM_Nnodes*this.NodeVars + this.SWMM_Nlinks*this.LinkVars + vIndex);
      
      return offset1 + RECORDSIZE * offset2;
  };
  
  // When reading an integer value from a binary file.
  swmmresult.readInt = function(content, offset, recordsize) {
      return new Int32Array(content.slice(offset, offset + recordsize))[0]
  };

  // When reading a float value from a binary file.
  swmmresult.readFloat = function(content, offset, recordsize) {
      return new Float32Array(content.slice(offset, offset + recordsize))[0]
  };

  return swmmresult;
};

  // Test if a variable exists or is not null
  // This is used to check an object name that has many types.
  // These multi-typed objects might be better off with
  // a identity flag. How can you place an identity flag on
  // a primitive or an array? Do not attempt to purify this
  // data, because the model should have polymorphic elements.
  // There just needs to be a way of identifying what kind of
  // morph an element is.
  function isValidData(data){
    if(typeof data !== 'undefined' && data !== null)
      return true
    return false
  }

// saveInp is called when a save button is clicked.
function saveInp(model) {
  let inpString = dataToInpString(model);

  let fileOut = 'swmmjs.inp';
  let blob = new Blob([inpString], {type: 'text/csv'});
  if(window.navigator.msSaveOrOpenBlob){
    window.navigator.msSaveBlob(blob, fileOut);
  } else {
    let elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = fileOut;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }

  return inpString;
}

// fileToString is called when loading a file
async function fileToString(usrFile){
  const response = await fetch(usrFile)
  var txtModel = await response.json()
  return txtModel
}

// old wasm assist
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}

////////////////////////////////////////////////////////////
// Mapping assist functions
////////////////////////////////////////////////////////////

// Finding the centroid of the first section of a line
// arr: [[x,y],[x,y]]
function segmentCentroid(arr){
  let newArr = [(arr[1][0]-arr[0][0])/2+arr[0][0], (arr[1][1]-arr[0][1])/2+arr[0][1]]
  return newArr
}

// Translate a model's subcatchments into an array of polygons:
function jsonArray_Subcatchments(model){
  var polyArray = []

  // Add each polygon to the features array in the geoJ object.
  for(let entry in model['Polygons']){
    var rec = model['Polygons'][entry]
    polyObj = {
      name: entry,
      points: []
    }
    
    for(let el in rec){
      polyObj.points.push( { "x": rec[el].x, "y": rec[el].y } )
    }

    polyArray.push(polyObj)
  }

  return polyArray
}

// Translate a model's subcatchments into geoJSON objects:
function geoJSON_Subcatchments(model){
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each polygon to the features array in the geoJ object.
  for(let entry in model['Polygons']){
    var rec = model['Polygons'][entry]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[]]
      },
      properties: {
        name: entry
      }
    }
    for(let el in rec){
      polyObj.geometry.coordinates[0].push([rec[el].x, rec[el].y])
    }

    geoJ.features.push(polyObj)
  }

  return geoJ
}

// Translate a model's points into geoJSON objects:
function geoJSON_Points(model){
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each point to the features array in the geoJ object.
  for(let entry in model['COORDINATES']){
    var rec = model['COORDINATES'][entry]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [rec.x, rec.y]
      },
      properties: {
        name: entry
      }
    }

    geoJ.features.push(polyObj)
  }

  return geoJ
}

function traceConduitLinks(model){
  var links = getAllLinks(model)
  var trace = []
  // Make sure the link is in the model
  
  for(let entry in links){
    rec = links[entry]
    if(links[entry].linkType === 'CONDUITS'){
      if(!trace.includes(entry)){
        trace.push(entry)
      }
    }
  }

  return trace
}

function traceSpecialLinks(model, section){
  var links = getAllLinks(model)
  var trace = []
  // Make sure the link is in the model
  
  for(let entry in links){
    rec = links[entry]
    if(links[entry].linkType === section){
      if(!trace.includes(entry)){
        trace.push(entry)
      }
    }
  }

  return trace
}

function traceSpecialNodes(model, section){
  var nodes = getAllNodes(model)
  var trace = []
  // Make sure the node is in the model
  
  for(let entry in nodes){
    rec = nodes[entry]
    if(nodes[entry].nodeType === section){
      if(!trace.includes(entry)){
        trace.push(entry)
      }
    }
  }

  return trace
}

function traceAllLinks(model){
  var links = getAllLinks(model)
  var trace = []
  // Make sure the link is in the model
  
  for(let entry in links){
    rec = links[entry]
    if(!trace.includes(entry)){
      trace.push(entry)
    }
  }

  return trace
}

// Translate an array of point coordsinates into geoJSON objects:
function geoJSON_AnyCoords(coordArray){
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each point to the features array in the geoJ object.
  for(let entry in coordArray){
    var rec = coordArray[entry]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [rec[0], rec[1]]
      },
      properties: {
      }
    }

    geoJ.features.push(polyObj)
  }

  return geoJ
}

// Translate any list of link ids into geoJSON objects:
function geoJSON_LinkStarts(model, linkList){
  var allLinks = getAllLinks(model)
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each line to the features array in the geoJ object.
  // Use conduits
  for(let entry in linkList){
    var linkPoints = []
    var rec = allLinks[linkList[entry]]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: []
      },
      properties: {
        name: linkList[entry]
      }
    }
    
    // Insert the 'inlet' node position
    linkPoints.push([model['COORDINATES'][rec.Node1].x, model['COORDINATES'][rec.Node1].y])

    // Add any intermediate vertices
    for(let vertArray in model.VERTICES){
      if(vertArray == linkList[entry]){
        for(let vert in model.VERTICES[vertArray]){
          linkPoints.push([model['VERTICES'][vertArray][vert].x, model['VERTICES'][vertArray][vert].y])
        }
      }
    }
    
    // Insert the 'outlet' node position
    linkPoints.push([model['COORDINATES'][rec.Node2].x, model['COORDINATES'][rec.Node2].y])

    polyObj.geometry.coordinates = segmentCentroid([linkPoints[0], linkPoints[1]])
    geoJ.features.push(polyObj)
  }
  return geoJ
}

// Translate any list of link ids into geoJSON objects:
function geoJSON_AnyLinks(model, linkList){
  var allLinks = getAllLinks(model)
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each line to the features array in the geoJ object.
  // Use conduits
  for(let entry in linkList){
    var rec = allLinks[linkList[entry]]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: []
      },
      properties: {
        name: linkList[entry]
      }
    }
    
    // Insert the 'inlet' node position
    polyObj.geometry.coordinates.push([model['COORDINATES'][rec.Node1].x, model['COORDINATES'][rec.Node1].y])

    // Add any intermediate vertices
    for(let vertArray in model.VERTICES){
      if(vertArray == linkList[entry]){
        for(let vert in model.VERTICES[vertArray]){
          polyObj.geometry.coordinates.push([model['VERTICES'][vertArray][vert].x, model['VERTICES'][vertArray][vert].y])
        }
      }
    }
    
    // Insert the 'outlet' node position
    polyObj.geometry.coordinates.push([model['COORDINATES'][rec.Node2].x, model['COORDINATES'][rec.Node2].y])

    geoJ.features.push(polyObj)
  }

  return geoJ
}

// Translate any list of node ids into geoJSON objects:
function geoJSON_AnyNodes(model, nodeList){
  var allNodes = getAllNodes(model)
  var geoJ = {
    type : "FeatureCollection",
    features : []
  }

  // Add each line to the features array in the geoJ object.
  // Use conduits
  for(let entry in nodeList){
    var rec = allNodes[nodeList[entry]]
    polyObj = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [rec.x, rec.y]
      },
      properties: {
        name: nodeList[entry]
      }
    }
    
    geoJ.features.push(polyObj)
  }

  return geoJ
}

// getAllLinks packs all of the link data into 
// an array of data structures like the following:
// {
//   id: 'id',
//   Node1: 'node1',
//   Node2: 'node2',
//   linkType: 'ORIFICE/PUMP/CONDUIT/ETC'
// }
// 
// This makes operations like tracing, translating and displaying easier.
function getAllLinks(model){
  var features = {}
  var linksTypes = ['CONDUITS', 'ORIFICES', 'PUMPS', 'WEIRS', 'OUTLETS']

  // Combine the links together
  for(let linkType in linksTypes){
    // Add all orifices to the links array.
    for(let entry in model[linksTypes[linkType]]){
      var rec = model[linksTypes[linkType]][entry]
      
      // Insert the link
      features[entry] = {
        Node1: rec.Node1,
        Node2: rec.Node2,
        linkType: linksTypes[linkType]
      }
    }
  }

  return features
}

// getAllNodes packs all of the node data into 
// an array of data structures like the following:
// {
//   id: 'id',
//   x: xPosition,
//   y: yPosition,
//   nodeType: 'JUNCTIONS/OUTFALLS/DIVIDERS/STORAGE'
// }
// 
// This makes operations like tracing, translating and displaying easier.
function getAllNodes(model){
  var features = {}
  var nodesTypes = ['JUNCTIONS', 'OUTFALLS', 'DIVIDERS', 'STORAGE']

  // Combine the links together
  for(let nodeType in nodesTypes){
    // Add all orifices to the links array.
    for(let entry in model[nodesTypes[nodeType]]){
      var rec = model[nodesTypes[nodeType]][entry]
      
      // Insert the link
      features[entry] = {
        nodeType: nodesTypes[nodeType]
      }
    }
    for(let entry in model.COORDINATES){
      if(features[entry]){
        var rec = model.COORDINATES[entry]
        features[entry].x = rec.x
        features[entry].y = rec.y
      }
    }
  }

  return features
}

// Trace upstream links from a link id
// Any trace of any type should just return a list of the ids.
// The calling function would then call geoJSON_anyLinks(links)
// with the array of link ids from functions like traceUpstreamLinks, 
// traceDownstreamLinks, traceAtNodeLinks, findConduits(links), findPumps(links), etc.
function traceUpstreamLinks(model, id){
  var links = getAllLinks(model)
  var trace = []
  // Make sure the link is in the model
  if(!links[id]) return trace
  trace.push(id)
  
  function getUsLink(id){
    for(let entry in links){
      rec = links[entry]
      if(links[entry].Node2 === links[id].Node1){
        if(!trace.includes(entry)){
          trace.push(entry)
          getUsLink(entry)
        }
      }
    }
  }

  getUsLink(id)

  return trace
}
