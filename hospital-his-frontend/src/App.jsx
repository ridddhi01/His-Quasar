import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/public/Landing';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import PatientsList from './pages/dashboard/PatientsList';
import AppointmentsList from './pages/dashboard/AppointmentsList';
import PatientDetails from './pages/dashboard/PatientDetails';
import OPDQueue from './pages/dashboard/OPDQueue';
import Consultation from './pages/doctor/Consultation';
import IPD from './pages/dashboard/IPD';
import Laboratory from './pages/dashboard/Laboratory';
import Radiology from './pages/dashboard/Radiology';
import Pharmacy from './pages/dashboard/Pharmacy';
import Billing from './pages/dashboard/Billing';
import Insurance from './pages/dashboard/Insurance';
import OperationTheatre from './pages/dashboard/OperationTheatre';
import Nursing from './pages/dashboard/Nursing';
import BedManagement from './pages/dashboard/BedManagement';
import Emergency from './pages/dashboard/Emergency';
import DoctorRounds from './pages/doctor/DoctorRounds';
import NurseDutyRoster from './pages/nursing/NurseDutyRoster';
import Admin from './pages/dashboard/Admin';
import ReportIncident from './pages/dashboard/ReportIncident';
import MyIncidents from './pages/dashboard/MyIncidents';
import DepartmentIncidents from './pages/dashboard/DepartmentIncidents';
import IncidentDetail from './pages/dashboard/IncidentDetail';
import DashboardLayout from './layouts/DashboardLayout';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Admin Module Imports
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import BreakGlassManagement from './pages/admin/BreakGlassManagement';
import AuditLogs from './pages/admin/AuditLogs';
import RevenueAnomalies from './pages/admin/RevenueAnomalies';
import Incidents from './pages/admin/Incidents';
import Compliance from './pages/admin/Compliance';
import MasterData from './pages/admin/MasterData';
import Departments from './pages/admin/Departments';
import SystemHealth from './pages/admin/SystemHealth';

import AdminGuard from './components/guards/AdminGuard';
import ClinicalGuard from './components/guards/ClinicalGuard';
import InventoryGuard from './components/guards/InventoryGuard';

// Inventory Manager Imports
import {
  InventoryDashboard,
  ItemMaster,
  ItemForm,
  ItemAuditLog,
  VendorList,
  VendorForm,
  PurchaseOrderList,
  PurchaseOrderForm,
  GRNList,
  GRNForm,
  StockLevels,
  StockIssueList,
  StockIssueForm,
  StockTransferList,
  StockTransferForm,
  PlaceholderPage
} from './pages/inventory';

// Clinical Coding Imports
import CodingDashboard from './pages/coding/CodingDashboard';
import CodingQueue from './pages/coding/CodingQueue';
import ProcedureCodes from './pages/coding/ProcedureCodes';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Clinical Dashboard Routes */}
          <Route path="/dashboard" element={
            <ClinicalGuard>
              <DashboardLayout />
            </ClinicalGuard>
          }>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<PatientsList />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="appointments" element={<AppointmentsList />} />
            <Route path="opd-queue" element={<OPDQueue />} />
            <Route path="consultation/:appointmentId" element={<Consultation />} />
            <Route path="pharmacy" element={<Pharmacy />} />
            <Route path="ipd" element={<IPD />} />
            <Route path="lab" element={<Laboratory />} />
            <Route path="radiology" element={<Radiology />} />
            <Route path="billing" element={<Billing />} />
            <Route path="insurance" element={<Insurance />} />
            <Route path="ot" element={<OperationTheatre />} />
            <Route path="admin" element={<Admin />} />
            <Route path="nursing" element={<Nursing />} />
            <Route path="bed-management" element={<BedManagement />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="doctor-rounds" element={<DoctorRounds />} />
            <Route path="duty-roster" element={<NurseDutyRoster />} />
            <Route path="report-incident" element={<ReportIncident />} />
            <Route path="my-incidents" element={<MyIncidents />} />
            <Route path="department-incidents" element={<DepartmentIncidents />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />

            {/* Clinical Coding Routes */}
            <Route path="coding" element={<CodingDashboard />} />
            <Route path="coding/queue" element={<CodingQueue />} />
            <Route path="coding/review" element={<CodingQueue />} /> {/* Reusing Queue with filter logic if needed, or create ReviewQueue */}
            <Route path="coding/procedure-codes" element={<ProcedureCodes />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminGuard>
              <DashboardLayout />
            </AdminGuard>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="break-glass" element={<BreakGlassManagement />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="revenue-anomalies" element={<RevenueAnomalies />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="master-data" element={<MasterData />} />
            <Route path="departments" element={<Departments />} />
            <Route path="system" element={<SystemHealth />} />
          </Route>

          {/* Inventory Manager Routes */}
          <Route path="/inventory" element={
            <InventoryGuard>
              <DashboardLayout />
            </InventoryGuard>
          }>
            <Route index element={<InventoryDashboard />} />
            {/* Items */}
            <Route path="items" element={<ItemMaster />} />
            <Route path="items/new" element={<ItemForm />} />
            <Route path="items/:id" element={<ItemForm />} />
            <Route path="items/:id/edit" element={<ItemForm />} />
            <Route path="items/:id/audit" element={<ItemAuditLog />} />
            {/* Vendors */}
            <Route path="vendors" element={<VendorList />} />
            <Route path="vendors/new" element={<VendorForm />} />
            <Route path="vendors/:id" element={<VendorForm />} />
            <Route path="vendors/:id/edit" element={<VendorForm />} />
            {/* Purchase Orders */}
            <Route path="purchase-requisitions" element={<PlaceholderPage />} />
            <Route path="purchase-orders" element={<PurchaseOrderList />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="purchase-orders/:id" element={<PlaceholderPage />} />
            {/* GRN */}
            <Route path="grns" element={<GRNList />} />
            <Route path="grns/new" element={<GRNForm />} />
            {/* Stock Operations */}
            <Route path="stock/levels" element={<StockLevels />} />
            <Route path="stock/low-stock" element={<StockLevels />} />
            <Route path="stock/near-expiry" element={<StockLevels />} />
            <Route path="stock/expired" element={<StockLevels />} />
            <Route path="stock-issues" element={<StockIssueList />} />
            <Route path="stock-issues/new" element={<StockIssueForm />} />
            <Route path="stock-transfers" element={<StockTransferList />} />
            <Route path="stock-transfers/new" element={<StockTransferForm />} />
            <Route path="stock-returns" element={<PlaceholderPage />} />
            {/* Audit */}
            <Route path="audit" element={<PlaceholderPage />} />
            <Route path="recalls" element={<PlaceholderPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
