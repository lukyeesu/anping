const fs = require('fs');
const path = require('path');

const extractComponent = (startLine, endLine, newFilePath, componentName) => {
    const appJsxPath = path.join(__dirname, '../src/App.jsx');
    const content = fs.readFileSync(appJsxPath, 'utf8');
    const lines = content.split(/\r?\n/);

    // 0-indexed arrays
    const startIdx = startLine - 1;
    const endIdx = endLine; // exclusive slice

    const componentLines = lines.slice(startIdx, endIdx);
    const componentContent = componentLines.join('\n');

    // Remove the lines from App.jsx and insert an import statement at the top (after other imports)
    const newLines = [
        ...lines.slice(0, startIdx),
        ...lines.slice(endIdx)
    ];

    // Add import statement at a safe line (e.g. line 17)
    newLines.splice(16, 0, `import ${componentName} from './pages/${componentName}';`);

    fs.writeFileSync(appJsxPath, newLines.join('\n'), 'utf8');
    
    // Create the new file with standard imports
    const newFileContent = `import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { 
  POS_ICONS, 
  GOOGLE_SCRIPT_URL, 
  LOCAL_VISION_API_KEY, 
  monthsTH, 
  monthsShortTH, 
  daysTH, 
  daysShortTH, 
  rAFThrottle 
} from '../global/constants';

${componentContent}

export default ${componentName};
`;

    fs.writeFileSync(path.join(__dirname, '../', newFilePath), newFileContent, 'utf8');
    console.log(`Successfully extracted ${componentName} to ${newFilePath}`);
};

const args = process.argv.slice(2);
extractComponent(parseInt(args[0]), parseInt(args[1]), args[2], args[3]);
