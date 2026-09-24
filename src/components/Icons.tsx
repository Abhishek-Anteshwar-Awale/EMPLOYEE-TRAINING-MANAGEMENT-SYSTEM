type IconProps = { size?: number; className?: string };

const I = (path: string, viewBox = "0 0 24 24") =>
  function Icon({ size = 18, className = "" }: IconProps) {
    return (
      <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d={path} />
      </svg>
    );
  };

export const HomeIcon = I("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10");
export const BookIcon = I("M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z");
export const CalendarIcon = I("M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z");
export const UsersIcon = I("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75");
export const CheckSquareIcon = I("M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11");
export const BarChartIcon = I("M12 20V10 M18 20V4 M6 20v-4");
export const PlusIcon = I("M12 5v14 M5 12h14");
export const EditIcon = I("M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z");
export const XIcon = I("M18 6L6 18 M6 6l12 12");
export const ChevronDownIcon = I("M6 9l6 6 6-6");
export const SearchIcon = I("M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0");
export const AlertIcon = I("M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01");
export const ClockIcon = I("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2");
export const CheckIcon = I("M20 6L9 17l-5-5");
export const UserIcon = I("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z");
export const LogoutIcon = I("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9");
// New icons for extended features
export const DownloadIcon = I("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3");
export const FilterIcon = I("M22 3H2l8 9.46V19l4 2v-8.54L22 3z");
export const EyeIcon = I("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0");
export const UserPlusIcon = I("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6");
export const TrashIcon = I("M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2");
export const FileTextIcon = I("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8");
