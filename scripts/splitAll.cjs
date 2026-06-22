const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const appJsxPath = path.join(__dirname, '../src/App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');

const ast = parser.parse(content, {
  sourceType: 'module',
  plugins: ['jsx']
});

const componentsToExtract = [
  'Skeleton', 'AnimatedModal', 'PortalDropdown', 'PlaceholderPage', 'CustomSelect',
  'CalendarView', 'AppointmentManager', 'StatCard', 'ExecutiveDashboard', 'Dashboard',
  'MedicalRecords', 'POSSystem', 'CatalogManager', 'BranchManager', 'InventoryManager',
  'FinancePage', 'StaffManager', 'ReportsManager', 'PdpaConsentForm', 'SettingsManager',
  'CalendarDay', 'PatientModal', 'TransactionRow', 'TransactionCard', 'FinanceTableSection',
  'LoginScreen', 'ProfileManager'
];

let newContent = content;
const importsToAdd = [];

// Since string manipulation via indices from AST can shift if done in place, 
// we collect all nodes, sort by end index descending, so replacing won't affect earlier indices.
const nodesToRemove = [];

traverse(ast, {
  VariableDeclaration(pathNode) {
    if (pathNode.parent.type !== 'Program') return; // only top level

    const declaration = pathNode.node.declarations[0];
    if (declaration && declaration.id && declaration.id.name) {
      const name = declaration.id.name;
      if (componentsToExtract.includes(name)) {
        nodesToRemove.push({
          name,
          start: pathNode.node.start,
          end: pathNode.node.end
        });
      }
    }
  }
});

// Sort descending by start to safely slice the string
nodesToRemove.sort((a, b) => b.start - a.start);

for (const nodeInfo of nodesToRemove) {
    const componentContent = content.substring(nodeInfo.start, nodeInfo.end);
    
    // Create new file
    const newFilePath = path.join(__dirname, '../src/pages', `${nodeInfo.name}.jsx`);
    const newFileContent = `import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, Users, CalendarRange, Calculator, 
  Package, BarChart3, Settings, Building2, Search, 
  Plus, X, CheckCircle2, AlertCircle, MapPin, Phone,
  Clock, Stethoscope, FileText, Pill, CreditCard, ShieldCheck, AlertOctagon,
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck,
  ShoppingCart, Tag, Minus, Banknote, QrCode, Receipt, ScanText, Camera, Upload, History, Activity,
  TrendingUp, TrendingDown, Download, Filter, Printer, ShoppingBag, XCircle,
  UserCog, BadgeCheck, Wallet, CalendarClock, DollarSign, Award, CalendarX2, HeartPulse, UserPlus, Mail, CheckSquare, Volume2, Megaphone, Link, ExternalLink, LogOut,
  Lock, Home, Save, UserCheck, Key, RotateCcw
} from 'lucide-react';
import { theme } from '../global/theme';

${componentContent}

export default ${nodeInfo.name};
`;

    fs.writeFileSync(newFilePath, newFileContent, 'utf8');
    console.log(`Extracted ${nodeInfo.name}`);

    // Update newContent string
    newContent = newContent.substring(0, nodeInfo.start) + newContent.substring(nodeInfo.end);
    
    // Some components might be in components/ but we'll put all in pages for now,
    // or we can sort them later.
    importsToAdd.push(`import ${nodeInfo.name} from './pages/${nodeInfo.name}';`);
}

// Now insert imports at line 17
const lines = newContent.split(/\r?\n/);
lines.splice(16, 0, ...importsToAdd);

fs.writeFileSync(appJsxPath, lines.join('\n'), 'utf8');
console.log('App.jsx updated with imports');
