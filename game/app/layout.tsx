import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Void Explorer — The First Frontier',description:'Fly a four-wing exploration ship through a procedural universe. Find a star, cross deep space, and descend to alien worlds.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
