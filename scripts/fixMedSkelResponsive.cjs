const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/MedicalRecords.jsx');
let c = fs.readFileSync(file, 'utf8');

// The main skeleton row
const oldSkel = `                            <td className="py-4 pl-6"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4 text-center"><div className="h-4 w-10 bg-slate-200 rounded animate-pulse mx-auto"></div></td>`;

const newSkel = `                            <td className="py-4 pl-6"><div className="h-4 w-3/4 max-w-[80px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[200px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[150px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[100px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4 text-center"><div className="h-4 w-10 bg-slate-200 rounded animate-pulse mx-auto"></div></td>`;

c = c.replaceAll(oldSkel, newSkel);

fs.writeFileSync(file, c);
console.log('Fixed skeletons width!');
