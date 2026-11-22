import type { LandCategory } from "../lib/demo-marketplace";

export function LandIllustration({ category }: { category: LandCategory }) {
  return (
    <svg className="listing-art" viewBox="0 0 440 175" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {category === "Agricultural" && (
        <>
          <path fill="#dfe9bf" d="M0 0h440v175H0z" />
          <path fill="#a4b984" d="M0 24 80 10l54 48-83 35L0 80zm157 25 106-34 64 49-32 41-119 23zM288 0h152v75l-94 1z" />
          <path fill="#8bab76" d="M0 110 80 96l87 48-3 31H0zm330 9 110-31v87H281z" />
          <path fill="none" stroke="#edf3da" strokeWidth="3" d="m-9 40 88-20m-81 31 91-22M3 62l98-25M9 73l101-26m44 13 120-35M153 73l131-39M159 85l139-41M163 97l148-42m-2 91 141-42m-155 56 155-44m-153 54 149-42" />
          <path fill="#7baba0" d="M-10 85c135-38 146 89 281 48 60-18 111-70 181-60v10c-70-5-116 45-177 62C134 185 125 58-10 96z" />
          <path fill="#d0b765" fillOpacity=".62" stroke="#fcf1c9" strokeWidth="2.5" d="m168 76 69-22 29 40-78 24z" />
          <path fill="none" stroke="#f7e5a8" strokeWidth="1.3" d="m174 84 67-22m-59 32 67-23m-64 33 71-24" />
        </>
      )}
      {category === "Residential" && (
        <>
          <path fill="#dae9dd" d="M0 0h440v175H0z" />
          <path fill="#b7d0bc" d="m0 0 135 0 46 56L67 72 0 42zm440 0v175H309l-40-40 54-88zM6 105l97 4 39 66H0z" />
          <path fill="none" stroke="#faf8eb" strokeWidth="12" d="m-12 76 96 23 132-31 102 32 132-36M148-8l71 75-30 120" />
          <path fill="#98b9a4" stroke="#eff5ef" strokeWidth="2" d="m72 59 58-10 19 26-54 15zm76-14 34-7 23 26-44 10zm85 2 60-20 26 21-34 31-53-14zm-9 71 47 9-18 44h-44zM48 115l47 1 15 36H45z" />
          <path fill="#ddc37d" stroke="#fff7dc" strokeWidth="2.5" d="m229 78 75 24-17 35-69-18z" />
          <path fill="#f8f4e5" d="m248 92 21 7-6 17-21-7zm-150-28 20-4 7 10-20 5zm145-12 24-8 10 12-24 9zm-17 86 13 3-4 14-14-4z" />
          <path fill="#739982" d="M354 48a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm31 73a12 12 0 1 0 0 24 12 12 0 0 0 0-24zM60 24a12 12 0 1 0 0 24 12 12 0 0 0 0-24z" />
        </>
      )}
      {category === "Commercial" && (
        <>
          <path fill="#e7e3cc" d="M0 0h440v175H0z" />
          <path fill="#b2c4a1" d="M0 0h156l-32 55L0 107zm294 0h146v69l-69 13zM0 144l117-38 29 69H0zm287 31 48-49 105-22v71z" />
          <path fill="none" stroke="#f9f7e9" strokeWidth="18" d="M-10 130c156-50 259-53 462-36M131-10l54 107 26 86M353-12l-50 60-8 39" />
          <path fill="none" stroke="#bbb39a" strokeWidth="1.25" strokeDasharray="6 5" d="M-10 130c156-50 259-53 462-36" />
          <path fill="#c4ad69" stroke="#fcf2d1" strokeWidth="2.5" d="m184 52 86-12 13 39-85 7z" />
          <path fill="#9ca990" d="m212 114 52-5 5 22-47 7zm69-6 25-1 4 22-27 3zm-50 35 41-5 5 19-39 9zm-115-17 35-12 10 25-31 13zm250-88 38 7-4 19-43-7z" />
          <path fill="#719479" d="M59 42a13 13 0 1 0 0 26 13 13 0 0 0 0-26zm32-17a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm289 105a13 13 0 1 0 0 26 13 13 0 0 0 0-26z" />
        </>
      )}
    </svg>
  );
}
