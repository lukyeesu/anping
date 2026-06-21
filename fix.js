const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const reps = [
  ['{showPrefixDropdown && !isViewMode && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top\">', '<PortalDropdown isVisible={showPrefixDropdown && !isViewMode} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-200\">'],
  ['{openTxDropdownIndex === txIndex && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top\">', '<PortalDropdown isVisible={openTxDropdownIndex === txIndex} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-200\">'],
  ['{showDoctorSuggest && \\(currentUser\\.role !== \\'doctor\\' && currentUser\\.category !== \\'doctor\\'\\) && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top flex flex-col\">', '<PortalDropdown isVisible={showDoctorSuggest && (currentUser.role !== \\'doctor\\' && currentUser.category !== \\'doctor\\')} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in duration-200 flex flex-col\">'],
  ['{openTxDropdownIndex === txIndex && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top flex flex-col\">', '<PortalDropdown isVisible={openTxDropdownIndex === txIndex} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in duration-200 flex flex-col\">'],
  ['{isPatientDropdownOpen && (\\s*)<div className=\"absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top\">', '<PortalDropdown isVisible={isPatientDropdownOpen} className=\"bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in duration-200\">'],
  ['{showCategorySuggest && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top\">', '<PortalDropdown isVisible={showCategorySuggest} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in duration-200\">'],
  ['{showPatientSuggest && formData\\.searchPatient && (\\s*)<div className=\"absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar\">', '<PortalDropdown isVisible={showPatientSuggest && !!formData.searchPatient} className=\"bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar\">']
];

reps.forEach(r => {
  let rgx = new RegExp(r[0], 'g');
  let match;
  while ((match = rgx.exec(code)) !== null) {
      let startIndex = match.index;
      let afterStr = code.substring(startIndex + match[0].length);
      let depth = 1;
      let j = 0;
      while(j < afterStr.length && depth > 0) {
          if (afterStr.substring(j, j+4) === '<div') depth++;
          if (afterStr.substring(j, j+6) === '</div') depth--;
          j++;
      }
      let beforeEnd = afterStr.substring(0, j + 5);
      let rest = afterStr.substring(j + 5);
      let closeMatch = rest.match(/^\s*\)\}/);
      if (closeMatch) {
          let replacedPart = r[1] + beforeEnd.substring(0, beforeEnd.length - 6) + '</PortalDropdown>';
          code = code.substring(0, startIndex) + replacedPart + rest.substring(closeMatch[0].length);
          rgx.lastIndex = startIndex + replacedPart.length;
      }
  }
});

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
