import { useConsole, type TabKey } from './hooks/useConsole';
import { Layout } from './components/Layout';
import { DashboardTab } from './components/tabs/DashboardTab';
import { CalendarTab } from './components/tabs/CalendarTab';
import { CreateBookingTab } from './components/tabs/CreateBookingTab';
import { BookingDetailsTab } from './components/tabs/BookingDetailsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { CustomersTab } from './components/tabs/CustomersTab';
import { MoneyTab } from './components/tabs/MoneyTab';
import { Gate } from '../onboarding/pages/Gate';
import { ConfirmDialog, PromptModal } from '@nemsalon/ui';
import { ImpersonationBanner, useImpersonation } from '../impersonation/ImpersonationBanner';
import { useEffect, useState } from 'react';
import type { AuthMeResponse } from './types';

interface OwnerConsoleProps {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
}

export function OwnerConsole({ initialMe, skipGate }: OwnerConsoleProps) {
  const console = useConsole(initialMe, skipGate);
  const {
    activeTab,
    setActiveTab,
    gateState,
    setGateState,
    me,
    statusMessage,
    confirmState,
    closeConfirm,
    timeZone,
    // Data
    staff,
    staffLoading,
    staffError,
    refreshStaff,
    services,
    servicesLoading,
    servicesError,
    refreshServices,
    customers,
    customersLoading,
    customersError,
    bookings,
    bookingsLoading,
    bookingsError,
    businessHours,
    setBusinessHoursState,
    businessHoursLoading,
    businessHoursError,
    refreshBusinessHours,
    // Dashboard
    dashboardData,
    dashboardLoading,
    dashboardError,
    loadDashboard,
    // Calendar
    calendarDate,
    setCalendarDate,
    calendarView,
    setCalendarView,
    calendarStaffId,
    setCalendarStaffId,
    refreshBookings,
    // Booking Creation
    selectedServiceId,
    setSelectedServiceId,
    selectedStaffId,
    setSelectedStaffId,
    selectedCustomerId,
    setSelectedCustomerId,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    availabilityDate,
    setAvailabilityDate,
    availabilitySlots,
    availabilityLoading,
    availabilityError,
    customDate,
    setCustomDate,
    customTime,
    setCustomTime,
    checkoutLink,
    setCheckoutLink,
    loadAvailability,
    handleCreateBooking,
    handleCustomBooking,
    // Booking Details
    selectedBookingId,
    setSelectedBookingId,
    bookingLookupId,
    setBookingLookupId,
    bookingPayment,
    handleLookupBooking,
    handleCancelBooking,
    handleForceConfirm,
    handleRefundPayment,
    handleReconcilePayment,
    // Customer Management
    customerForm,
    setCustomerForm,
    customerEditId,
    customerEdit,
    setCustomerEdit,
    customerBusy,
    customerStatus,
    resetCustomerForm,
    handleSelectCustomer,
    handleCreateCustomer,
    handleUpdateCustomer,
    refreshCustomers,
    // Staff Settings
    staffHoursTarget,
    setStaffHoursTarget,
    staffHoursWeekly,
    setStaffHoursWeekly,
    staffHoursStatus,
    setStaffHoursStatus,
    staffHoursLoading,
    staffHoursError,
    staffServicesSelection,
    staffServicesTarget,
    setStaffServicesTarget,
    handleLoadStaffWorkingHours,
    handleSaveStaffWorkingHours,
    handleStaffServiceToggle,
    handleCreateStaff,
    handleInviteStaff,
    handleUpdateStaff,
    handleCreateService,
    handleUpdateService,
    handleSaveBusinessHours,
    // Time Off
    timeOffEntries,
    timeOffLoading,
    timeOffError,
    timeOffStart,
    setTimeOffStart,
    timeOffEnd,
    setTimeOffEnd,
    timeOffReason,
    setTimeOffReason,
    handleLoadTimeOff,
    handleCreateTimeOff,
    handleDeleteTimeOff,
    stripeStatus,
    stripeStatusLoading,
    stripeActionLoading,
    stripeStatusError,
    handleStartStripeConnect,
    promptState,
    closePrompt,
    // Derived
    staffById,
    copy,
  } = console;

  const { isImpersonating, impersonatedUser, isLoading, checkStatus, stopImpersonation } =
    useImpersonation();

  const handleGateRetry = () => {
    setGateState('recovering');
  };

  useEffect(() => {
    if (gateState !== 'recovering') return;
    const timer = setTimeout(() => setGateState('checking'), 100);
    return () => clearTimeout(timer);
  }, [gateState]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Gate states
  if (gateState === 'checking') {
    return <Gate state="checking" onRetry={handleGateRetry} />;
  }

  if (gateState === 'needs-login') {
    return <Gate state="needs-login" onRetry={handleGateRetry} />;
  }

  if (gateState === 'error') {
    return <Gate state="error" onRetry={handleGateRetry} />;
  }

  if (gateState === 'recovering') {
    return <Gate state="recovering" onRetry={handleGateRetry} />;
  }

  // Modal states for booking creation and details
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    // Close any open modals when switching tabs
    setIsCreateModalOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedBookingId('');
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Reset form state when closing
    setSelectedServiceId('');
    setSelectedStaffId('');
    setSelectedCustomerId('');
    setCheckoutLink(null);
  };

  const handleOpenDetailsModal = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedBookingId('');
    setBookingLookupId('');
  };

  const handleSwitchToRole = async (role: 'owner' | 'staff' | 'customer') => {
    if (role === 'customer') {
      window.location.href = '/portal';
      return;
    }
    if (role === 'staff') {
      window.location.href = '/';
    }
  };

  const handleReturnToAdmin = async () => {
    await stopImpersonation();
  };

  const handleRetryCalendar = () => {
    refreshStaff();
    refreshBusinessHours();
    refreshBookings(calendarDate, calendarStaffId || undefined);
  };

  const handleRetryCreateBooking = () => {
    refreshStaff();
    refreshServices();
    refreshCustomers();
  };

  const handleRetrySettings = () => {
    refreshStaff();
    refreshServices();
    refreshCustomers();
    refreshBusinessHours();
  };

  const handleRetryAvailability = () => {
    if (!selectedServiceId) return;
    loadAvailability(selectedServiceId, selectedStaffId || undefined);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardTab
            data={dashboardData}
            loading={dashboardLoading}
            error={dashboardError}
            onRetry={loadDashboard}
            onTabChange={(tab) => handleTabChange(tab as TabKey)}
            onSelectBooking={handleOpenDetailsModal}
            copy={copy}
            timeZone={timeZone}
          />
        );

      case 'calendar':
        return (
          <CalendarTab
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            calendarStaffId={calendarStaffId}
            setCalendarStaffId={setCalendarStaffId}
            staff={staff}
            bookings={bookings}
            businessHours={businessHours}
            loading={bookingsLoading || staffLoading || businessHoursLoading}
            error={bookingsError || staffError || businessHoursError}
            onRetry={handleRetryCalendar}
            onCreateBooking={handleOpenCreateModal}
            onSelectBooking={handleOpenDetailsModal}
            copy={copy}
            timeZone={timeZone}
          />
        );

      case 'customers':
        return (
          <CustomersTab
            customers={customers}
            customersLoading={customersLoading}
            customersError={customersError}
            onRetry={() => refreshCustomers()}
            onCreateBooking={(customerId) => {
              setSelectedCustomerId(customerId);
              handleOpenCreateModal();
            }}
            onSelectBooking={handleOpenDetailsModal}
            copy={copy}
            timeZone={timeZone}
          />
        );

      case 'services-team':
        return (
          <SettingsTab
            staff={staff}
            staffLoading={staffLoading}
            staffError={staffError}
            onCreateStaff={handleCreateStaff}
            onInviteStaff={handleInviteStaff}
            onUpdateStaff={handleUpdateStaff}
            services={services}
            servicesLoading={servicesLoading}
            servicesError={servicesError}
            onCreateService={handleCreateService}
            onUpdateService={handleUpdateService}
            businessHours={businessHours}
            businessHoursLoading={businessHoursLoading}
            businessHoursError={businessHoursError}
            setBusinessHours={setBusinessHoursState}
            onSaveBusinessHours={handleSaveBusinessHours}
            staffServicesTarget={staffServicesTarget}
            setStaffServicesTarget={setStaffServicesTarget}
            staffServicesSelection={staffServicesSelection}
            onStaffServiceToggle={handleStaffServiceToggle}
            staffHoursTarget={staffHoursTarget}
            setStaffHoursTarget={setStaffHoursTarget}
            staffHoursWeekly={staffHoursWeekly}
            setStaffHoursWeekly={setStaffHoursWeekly}
            staffHoursStatus={staffHoursStatus}
            setStaffHoursStatus={setStaffHoursStatus}
            staffHoursLoading={staffHoursLoading}
            staffHoursError={staffHoursError}
            onLoadStaffWorkingHours={handleLoadStaffWorkingHours}
            onSaveStaffWorkingHours={handleSaveStaffWorkingHours}
            customers={customers}
            customersLoading={customersLoading}
            customersError={customersError}
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            customerEditId={customerEditId}
            customerEdit={customerEdit}
            setCustomerEdit={setCustomerEdit}
            customerBusy={customerBusy}
            customerStatus={customerStatus}
            onCreateCustomer={handleCreateCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onSelectCustomer={handleSelectCustomer}
            onResetCustomerForm={resetCustomerForm}
            selectedStaffId={selectedStaffId}
            setSelectedStaffId={setSelectedStaffId}
            timeOffEntries={timeOffEntries}
            timeOffLoading={timeOffLoading}
            timeOffError={timeOffError}
            timeOffStart={timeOffStart}
            setTimeOffStart={setTimeOffStart}
            timeOffEnd={timeOffEnd}
            setTimeOffEnd={setTimeOffEnd}
            timeOffReason={timeOffReason}
            setTimeOffReason={setTimeOffReason}
            onLoadTimeOff={handleLoadTimeOff}
            onCreateTimeOff={handleCreateTimeOff}
            onDeleteTimeOff={handleDeleteTimeOff}
            stripeStatus={stripeStatus}
            stripeStatusLoading={stripeStatusLoading}
            stripeActionLoading={stripeActionLoading}
            stripeStatusError={stripeStatusError}
            onStartStripeConnect={handleStartStripeConnect}
            onRetry={handleRetrySettings}
            copy={copy}
          />
        );

      case 'money':
        return (
          <MoneyTab
            bookings={bookings}
            payments={[]}
            stripeStatus={stripeStatus}
            stripeStatusLoading={stripeStatusLoading}
            onStartStripeConnect={handleStartStripeConnect}
            copy={copy}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {isImpersonating && impersonatedUser && (
        <ImpersonationBanner
          impersonatedUser={impersonatedUser}
          onSwitchToRole={handleSwitchToRole}
          onReturnToAdmin={handleReturnToAdmin}
          isLoading={isLoading}
          isSticky
        />
      )}

      <Layout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        salonName={me?.salon?.name}
        me={me}
        statusMessage={statusMessage}
        copy={copy}
        showReturnToAdmin={isImpersonating}
        onReturnToAdmin={handleReturnToAdmin}
      >
        {renderTab()}

        {confirmState && (
          <ConfirmDialog
            open={true}
            title={confirmState.title}
            body={confirmState.body}
            confirmLabel={confirmState.confirmLabel}
            cancelLabel={confirmState.cancelLabel}
            showReason={confirmState.showReason}
            reasonLabel={confirmState.reasonLabel}
            reasonPlaceholder={confirmState.reasonPlaceholder}
            reasonRequired={confirmState.reasonRequired}
            onConfirm={confirmState.onConfirm}
            onConfirmWithReason={confirmState.onConfirmWithReason}
            onCancel={closeConfirm}
          />
        )}

        {promptState && (
          <PromptModal
            isOpen={true}
            onClose={closePrompt}
            onSubmit={promptState.onSubmit}
            title={promptState.title}
            label={promptState.label}
            placeholder={promptState.placeholder}
            defaultValue={promptState.defaultValue}
            submitLabel={promptState.submitLabel}
          />
        )}

        {/* Create Booking Modal */}
        {isCreateModalOpen && (
          <div className="modal-overlay" onClick={handleCloseCreateModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <CreateBookingTab
                services={services}
                staff={staff}
                customers={customers}
                loading={servicesLoading || staffLoading || customersLoading}
                error={servicesError || staffError || customersError}
                onRetry={handleRetryCreateBooking}
                selectedServiceId={selectedServiceId}
                setSelectedServiceId={setSelectedServiceId}
                selectedStaffId={selectedStaffId}
                setSelectedStaffId={setSelectedStaffId}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={setSelectedCustomerId}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                availabilityDate={availabilityDate}
                setAvailabilityDate={setAvailabilityDate}
                availabilitySlots={availabilitySlots}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError}
                onRetryAvailability={handleRetryAvailability}
                customDate={customDate}
                setCustomDate={setCustomDate}
                customTime={customTime}
                setCustomTime={setCustomTime}
                checkoutLink={checkoutLink}
                setCheckoutLink={setCheckoutLink}
                onLoadAvailability={() =>
                  loadAvailability(selectedServiceId, selectedStaffId || undefined)
                }
                onCreateBooking={handleCreateBooking}
                onCustomBooking={handleCustomBooking}
                onTabChange={() => {}}
                onSelectBooking={(id) => {
                  handleCloseCreateModal();
                  handleOpenDetailsModal(id);
                }}
                copy={copy}
              />
              <button className="modal-close" onClick={handleCloseCreateModal}>
                ×
              </button>
            </div>
          </div>
        )}

        {/* Booking Details Modal */}
        {isDetailsModalOpen && (
          <div className="modal-overlay" onClick={handleCloseDetailsModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <BookingDetailsTab
                bookings={bookings}
                loading={bookingsLoading}
                error={bookingsError}
                onRetry={() => refreshBookings(calendarDate, calendarStaffId || undefined)}
                selectedBookingId={selectedBookingId}
                setSelectedBookingId={setSelectedBookingId}
                bookingLookupId={bookingLookupId}
                setBookingLookupId={setBookingLookupId}
                bookingPayment={bookingPayment}
                staffById={staffById}
                onLookup={handleLookupBooking}
                onCancel={() => handleCancelBooking()}
                onForceConfirm={handleForceConfirm}
                onRefund={handleRefundPayment}
                onReconcile={handleReconcilePayment}
                copy={copy}
              />
              <button className="modal-close" onClick={handleCloseDetailsModal}>
                ×
              </button>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}
