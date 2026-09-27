import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { ToolPlans } from './tool-plans';

export const metadata: Metadata = {
  title: 'Browse tool plans and prices | Sasify Solutions',
  description: 'Compare available plans, access types and PKR prices for each digital tool.',
};

export default function ToolsPage() {
  return <main><SiteHeader /><ToolPlans /><SiteFooter /></main>;
}
