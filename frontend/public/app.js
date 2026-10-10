const { useState, useEffect } = React;

function App() {
    const [activeTab, setActiveTab] = useState("book");
    const [timezones, setTimezones] = useState([]);
    const [selectedTz, setSelectedTz] = useState("America/New_York");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [slotsData, setSlotsData] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [mentorsData, setMentorsData] = useState(null);
    const [mentorFilterDate, setMentorFilterDate] = useState(new Date().toISOString().split("T")[0]);
    const [allBookings, setAllBookings] = useState([]);
    const [emails, setEmails] = useState([]);
    const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);

    const [formData, setFormData] = useState({
        parent_name: "",
        parent_email: "",
        parent_phone: "",
        student_name: "",
        student_age: 10,
        course_interest: "Python for Kids",
        notes: ""
    });

    useEffect(() => {
        fetch("/api/timezones")
            .then(res => res.json())
            .then(data => {
                setTimezones(data);
                try {
                    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const matched = data.find(t => t.id === localTz);
                    if (matched) setSelectedTz(matched.id);
                } catch(e) {}
            })
            .catch(err => console.error("Error fetching timezones:", err));

        loadMentorsAndBookings();
        loadEmails();

        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get("room");
        const bookingId = urlParams.get("booking");
        if (room) {
            setActiveMeetingRoom({ room_id: room, booking_id: bookingId });
            setActiveTab("classroom");
        }
    }, []);

    useEffect(() => {
        if (!selectedDate || !selectedTz) return;
        setLoadingSlots(true);
        setSelectedSlot(null);
        setBookingError(null);

        fetch(`/api/slots?date=${selectedDate}&timezone=${selectedTz}`)
            .then(res => res.json())
            .then(data => {
                setSlotsData(data);
                setLoadingSlots(false);
            })
            .catch(err => {
                console.error("Error fetching slots:", err);
                setLoadingSlots(false);
            });
    }, [selectedDate, selectedTz]);

    const loadMentorsAndBookings = (date = mentorFilterDate) => {
        fetch(`/api/mentors?ist_date=${date}`)
            .then(res => res.json())
            .then(data => setMentorsData(data))
            .catch(err => console.error(err));

        fetch("/api/bookings")
            .then(res => res.json())
            .then(data => setAllBookings(data))
            .catch(err => console.error(err));
    };

    const loadEmails = () => {
        fetch("/api/emails")
            .then(res => res.json())
            .then(data => setEmails(data))
            .catch(err => console.error(err));
    };

    const handleBookingSubmit = (e) => {
        e.preventDefault();
        if (!selectedSlot) {
            setBookingError("Please select an available time slot first.");
            return;
        }

        setSubmitting(true);
        setBookingError(null);

        const payload = {
            ...formData,
            parent_timezone: selectedTz,
            slot_date: selectedDate,
            slot_time: selectedSlot.time
        };

        fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || "Booking failed.");
                }
                return data;
            })
            .then(booking => {
                setBookingSuccess(booking);
                setSubmitting(false);
                loadMentorsAndBookings();
                loadEmails();
            })
            .catch(err => {
                setBookingError(err.message);
                setSubmitting(false);
            });
    };

    const handleSeedData = (count) => {
        fetch(`/api/seed-mock-bookings?date=${selectedDate}&count=${count}`, { method: "POST" })
            .then(res => res.json())
            .then(data => {
                alert(`Successfully created ${data.created} trial class bookings for ${selectedDate}!`);
                loadMentorsAndBookings();
                loadEmails();
                fetch(`/api/slots?date=${selectedDate}&timezone=${selectedTz}`)
                    .then(res => res.json())
                    .then(resData => setSlotsData(resData));
            });
    };

    const handleReset = () => {
        if (!confirm("Are you sure you want to reset all bookings and emails?")) return;
        fetch("/api/reset", { method: "POST" })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadMentorsAndBookings();
                loadEmails();
                fetch(`/api/slots?date=${selectedDate}&timezone=${selectedTz}`)
                    .then(res => res.json())
                    .then(resData => setSlotsData(resData));
            });
    };

    const currentTzInfo = timezones.find(t => t.id === selectedTz) || {};

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-100">
                            CY
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                                    Codeyoung
                                </h1>
                                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                                    Trial Booking System
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Cross-Timezone & DST Appointment Engine</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        <button
                            onClick={() => setActiveTab("book")}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === "book"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            📅 Book Trial Class
                        </button>
                        <button
                            onClick={() => { setActiveTab("mentors"); loadMentorsAndBookings(); }}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === "mentors"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            👥 Mentors & Capacity (10)
                        </button>
                        <button
                            onClick={() => { setActiveTab("emails"); loadEmails(); }}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                activeTab === "emails"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            ✉️ Email Simulator
                            {emails.length > 0 && (
                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                    {emails.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("classroom")}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === "classroom"
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            💻 Demo Live Room
                        </button>
                    </nav>
                </div>

                <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-t border-slate-800">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-white font-semibold">Live World Clock & DST Sync:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[11px]">
                            {timezones.slice(0, 6).map(tz => (
                                <div key={tz.id} className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                                    <span className="text-slate-400 font-mono">{tz.abbreviation} ({tz.offset}):</span>
                                    <span className="text-emerald-300 font-semibold">
                                        {new Date(tz.local_time_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {tz.is_dst && (
                                        <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded font-bold">
                                            DST Active
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === "book" && (
                    <ParentBookingFlow
                        timezones={timezones}
                        selectedTz={selectedTz}
                        setSelectedTz={setSelectedTz}
                        currentTzInfo={currentTzInfo}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        slotsData={slotsData}
                        selectedSlot={selectedSlot}
                        setSelectedSlot={setSelectedSlot}
                        loadingSlots={loadingSlots}
                        formData={formData}
                        setFormData={setFormData}
                        handleBookingSubmit={handleBookingSubmit}
                        submitting={submitting}
                        bookingSuccess={bookingSuccess}
                        setBookingSuccess={setBookingSuccess}
                        bookingError={bookingError}
                        setActiveTab={setActiveTab}
                        setActiveMeetingRoom={setActiveMeetingRoom}
                        handleSeedData={handleSeedData}
                        handleReset={handleReset}
                    />
                )}

                {activeTab === "mentors" && (
                    <MentorRosterView
                        mentorsData={mentorsData}
                        mentorFilterDate={mentorFilterDate}
                        setMentorFilterDate={setMentorFilterDate}
                        loadMentorsAndBookings={loadMentorsAndBookings}
                        allBookings={allBookings}
                        handleSeedData={handleSeedData}
                        handleReset={handleReset}
                    />
                )}

                {activeTab === "emails" && (
                    <EmailSimulationView
                        emails={emails}
                        loadEmails={loadEmails}
                        setActiveMeetingRoom={setActiveMeetingRoom}
                        setActiveTab={setActiveTab}
                    />
                )}

                {activeTab === "classroom" && (
                    <LiveClassroomView
                        activeMeetingRoom={activeMeetingRoom}
                        allBookings={allBookings}
                        setActiveTab={setActiveTab}
                    />
                )}
            </main>

            <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p>© 2026 Codeyoung Assignment • 10 Mentors • Max 2 Trial Classes/Day Constraint</p>
                    <p className="text-slate-400">Strict UTC storage • Zoneinfo DST conversion • Automated Mentor Dispatch</p>
                </div>
            </footer>
        </div>
    );
}

function ParentBookingFlow({
    timezones,
    selectedTz,
    setSelectedTz,
    currentTzInfo,
    selectedDate,
    setSelectedDate,
    slotsData,
    selectedSlot,
    setSelectedSlot,
    loadingSlots,
    formData,
    setFormData,
    handleBookingSubmit,
    submitting,
    bookingSuccess,
    setBookingSuccess,
    bookingError,
    setActiveTab,
    setActiveMeetingRoom,
    handleSeedData,
    handleReset
}) {
    const getFutureDate = (daysAhead) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        return d.toISOString().split("T")[0];
    };

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200 mb-3">
                        <span>🌟 100% Free 1-on-1 Trial Class</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Experience Coding with Top Mentors
                    </h2>
                    <p className="mt-2 text-indigo-200 text-sm sm:text-base leading-relaxed">
                        Pick a convenient slot in your local timezone. Our system assigns an expert mentor in India (IST) and automatically accounts for Daylight Saving Time (DST) differences.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-indigo-200">
                        <span className="bg-white/10 px-2.5 py-1 rounded-md">✓ 10 Available Mentors</span>
                        <span className="bg-white/10 px-2.5 py-1 rounded-md">✓ Max 2 Classes / Mentor / Day</span>
                        <span className="bg-white/10 px-2.5 py-1 rounded-md">✓ Instant Live Room Link</span>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-medium">
                    <span className="text-base">⚙️</span>
                    <span><strong>Demo & Testing Controls:</strong> Simulate high demand or test capacity limits (20 classes/day maximum across 10 mentors).</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleSeedData(18)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
                    >
                        Seed 18 Bookings
                    </button>
                    <button
                        onClick={() => handleSeedData(20)}
                        className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
                    >
                        Fill to Max 20 Capacity
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                        Reset All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                        <label className="block text-sm font-bold text-slate-800 mb-2">
                            Step 1: Your Local Timezone & DST Status
                        </label>
                        <select
                            value={selectedTz}
                            onChange={(e) => setSelectedTz(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            {timezones.map(tz => (
                                <option key={tz.id} value={tz.id}>
                                    {tz.label} — {tz.abbreviation} ({tz.offset}) {tz.is_dst ? "• [DST Active]" : ""}
                                </option>
                            ))}
                        </select>

                        {currentTzInfo.id && (
                            <div className="mt-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-indigo-950">Active Zone:</span>
                                    <span className="font-semibold text-indigo-700">{currentTzInfo.abbreviation} ({currentTzInfo.offset})</span>
                                </div>
                                <div>
                                    {currentTzInfo.is_dst ? (
                                        <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                                            <span>☀️</span> Daylight Saving Time (DST) Active
                                        </span>
                                    ) : (
                                        <span className="bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                            Standard Time (No DST active)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-slate-800">
                                Step 2: Choose Class Date
                            </label>
                            <span className="text-xs text-slate-500 font-medium">Local date in {currentTzInfo.abbreviation}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(getFutureDate(0))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedDate === getFutureDate(0)
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(getFutureDate(1))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedDate === getFutureDate(1)
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                Tomorrow
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(getFutureDate(2))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedDate === getFutureDate(2)
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                +2 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(getFutureDate(3))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedDate === getFutureDate(3)
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                +3 Days
                            </button>
                        </div>

                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    Step 3: Select an Available Time Slot
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Times displayed in your local timezone ({currentTzInfo.abbreviation || selectedTz}) with corresponding mentor IST time.
                                </p>
                            </div>
                            {slotsData && (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    slotsData.available_slots > 0
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                }`}>
                                    {slotsData.available_slots} / {slotsData.total_slots} Slots Free
                                </span>
                            )}
                        </div>

                        {loadingSlots ? (
                            <div className="py-12 text-center text-slate-400">
                                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-2 text-xs font-medium text-slate-500">Checking 10 mentors' daily quotas and schedules...</p>
                            </div>
                        ) : slotsData && slotsData.slots ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {slotsData.slots.map(slot => {
                                    const isSelected = selectedSlot && selectedSlot.time === slot.time;
                                    return (
                                        <button
                                            key={slot.time}
                                            type="button"
                                            disabled={!slot.is_available}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                                                isSelected
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                                                    : slot.is_available
                                                    ? "bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800 hover:border-indigo-300 cursor-pointer"
                                                    : "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                                                    {slot.time_12h}
                                                </span>
                                                {slot.is_available ? (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                        isSelected ? "bg-indigo-500 text-white" : "bg-emerald-100 text-emerald-800"
                                                    }`}>
                                                        {slot.available_mentors_count} Free
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                        Full / Off
                                                    </span>
                                                )}
                                            </div>

                                            <div className={`mt-2 text-[11px] font-medium flex items-center gap-1 ${
                                                isSelected ? "text-indigo-100" : "text-slate-500"
                                            }`}>
                                                <span>🇮🇳 IST:</span>
                                                <span>{slot.ist_time}</span>
                                            </div>

                                            {!slot.is_available && slot.unavailability_reason && (
                                                <span className="mt-1 text-[9px] text-slate-400 line-clamp-1" title={slot.unavailability_reason}>
                                                    {slot.unavailability_reason}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        {slotsData && slotsData.available_slots === 0 && (
                            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                                    <span>⚠️</span> All mentors are fully booked for this date!
                                </p>
                                <p className="mt-1">
                                    All 10 mentors have reached their daily quota (max 2 trial classes per day). Please select another date above.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 sticky top-28">
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                            Step 4: Student & Parent Details
                        </h3>
                        <p className="text-xs text-slate-500 mb-5">
                            We will email your confirmation and live class link immediately.
                        </p>

                        {selectedSlot ? (
                            <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">Selected Slot:</div>
                                    <div className="text-sm font-extrabold text-indigo-700">
                                        {selectedSlot.time_12h} {currentTzInfo.abbreviation} ({selectedDate})
                                    </div>
                                    <div className="text-xs text-indigo-600">Mentor IST: {selectedSlot.ist_time}</div>
                                </div>
                                <span className="text-xl">🎯</span>
                            </div>
                        ) : (
                            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs font-medium flex items-center gap-2">
                                <span>👉</span> Please click an available slot on the left to proceed.
                            </div>
                        )}

                        {bookingError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
                                <span className="text-base">❌</span>
                                <div>{bookingError}</div>
                            </div>
                        )}

                        <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Parent's Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Robert Smith"
                                        value={formData.parent_name}
                                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Parent's Email *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="robert@example.com"
                                        value={formData.parent_email}
                                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Student's Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Leo Smith"
                                        value={formData.student_name}
                                        onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Student's Age *</label>
                                    <select
                                        value={formData.student_age}
                                        onChange={(e) => setFormData({ ...formData, student_age: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(age => (
                                            <option key={age} value={age}>{age} years old</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Subject of Interest *</label>
                                <select
                                    value={formData.course_interest}
                                    onChange={(e) => setFormData({ ...formData, course_interest: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="Python for Kids">Python for Kids (Coding & Game Logic)</option>
                                    <option value="Scratch & Game Dev">Scratch & Block-Based Animation</option>
                                    <option value="Robotics & Web Development">Web Development (HTML/CSS/JS)</option>
                                    <option value="AI & Data Science for Kids">AI & Data Science for Young Minds</option>
                                    <option value="Minecraft Modding">Minecraft Modding & Physics</option>
                                    <option value="Mobile App Development">Mobile App Development</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Any Specific Goals or Notes? (Optional)</label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Total beginner, loves building games..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !selectedSlot}
                                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition flex items-center justify-center gap-2 ${
                                    submitting || !selectedSlot
                                        ? "bg-slate-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200"
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Assigning Available Mentor...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀 Confirm & Book Free Trial Class</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {bookingSuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            🎉
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900">
                            Trial Class Confirmed!
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Booking ID: <span className="font-mono font-bold text-slate-800">{bookingSuccess.id}</span>
                        </p>

                        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                                    {bookingSuccess.mentor_name[0]}
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-indigo-600">Assigned Mentor</div>
                                    <div className="text-base font-bold text-slate-900">{bookingSuccess.mentor_name}</div>
                                    <div className="text-xs text-slate-500">{bookingSuccess.mentor_email}</div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Student:</span>
                                    <span className="font-bold text-slate-900">{bookingSuccess.student_name} ({bookingSuccess.student_age} yrs)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Course:</span>
                                    <span className="font-bold text-slate-900">{bookingSuccess.course_interest}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Your Local Time:</span>
                                    <span className="font-bold text-indigo-700">{bookingSuccess.parent_display_time}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Mentor IST Time:</span>
                                    <span className="font-bold text-emerald-700">{bookingSuccess.mentor_display_time}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2.5">
                            <button
                                onClick={() => {
                                    const roomId = bookingSuccess.demo_meeting_link.split("room=")[1]?.split("&")[0] || "demo-room";
                                    setActiveMeetingRoom({ room_id: roomId, booking: bookingSuccess });
                                    setBookingSuccess(null);
                                    setActiveTab("classroom");
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2 text-sm"
                            >
                                <span>🎥 Open Live Demo Classroom</span>
                            </button>

                            <button
                                onClick={() => {
                                    setBookingSuccess(null);
                                    setActiveTab("emails");
                                }}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition text-xs"
                            >
                                ✉️ View Confirmation Emails Sent
                            </button>

                            <button
                                onClick={() => setBookingSuccess(null)}
                                className="w-full text-slate-400 hover:text-slate-600 text-xs py-1"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MentorRosterView({
    mentorsData,
    mentorFilterDate,
    setMentorFilterDate,
    loadMentorsAndBookings,
    allBookings,
    handleSeedData,
    handleReset
}) {
    useEffect(() => {
        loadMentorsAndBookings(mentorFilterDate);
    }, [mentorFilterDate]);

    const totalCapacity = (mentorsData?.mentors?.length || 10) * 2;
    const totalBooked = mentorsData?.total_booked_for_day || 0;
    const capacityPct = Math.round((totalBooked / totalCapacity) * 100);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-slate-900">
                                👥 10-Mentor Roster & Daily Capacity Tracker
                            </h2>
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
                                IST (UTC+5:30)
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Constraint Rule: Each mentor can accept <strong>at most 2 demo classes per calendar day</strong>. Total daily system capacity is 20 classes.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-700">Filter IST Date:</label>
                        <input
                            type="date"
                            value={mentorFilterDate}
                            onChange={(e) => setMentorFilterDate(e.target.value)}
                            className="bg-slate-50 border border-slate-300 font-semibold text-xs rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                        <span className="text-slate-700">Overall System Trial Class Utilization for {mentorFilterDate}:</span>
                        <span className={`${totalBooked >= totalCapacity ? "text-rose-600 font-extrabold" : "text-indigo-600"}`}>
                            {totalBooked} / {totalCapacity} Max Classes ({capacityPct}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${
                                totalBooked >= totalCapacity
                                    ? "bg-rose-600"
                                    : totalBooked >= 15
                                    ? "bg-amber-500"
                                    : "bg-indigo-600"
                            }`}
                            style={{ width: `${Math.min(capacityPct, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentorsData?.mentors?.map(mentor => {
                    const bookedClasses = mentor.daily_booked_classes;
                    const isMaxed = bookedClasses >= mentor.max_daily_classes;

                    return (
                        <div
                            key={mentor.id}
                            className={`bg-white rounded-2xl p-5 border shadow-sm transition flex flex-col justify-between ${
                                isMaxed ? "border-rose-300 bg-rose-50/20" : "border-slate-200/90 hover:border-indigo-300"
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                                            {mentor.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">{mentor.name}</h4>
                                            <p className="text-[11px] text-slate-500">{mentor.email}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isMaxed
                                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                                            : bookedClasses === 1
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    }`}>
                                        {isMaxed ? "At Capacity" : `${2 - bookedClasses} Slot Left`}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                                    {mentor.bio}
                                </p>

                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {mentor.specialties.map(s => (
                                        <span key={s} className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                                    <span className="text-slate-500">Daily Quota (Max 2):</span>
                                    <span className={`font-mono font-bold ${isMaxed ? "text-rose-600" : "text-indigo-600"}`}>
                                        {bookedClasses} / 2 Classes
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full ${
                                            isMaxed ? "bg-rose-500" : bookedClasses === 1 ? "bg-amber-500" : "bg-emerald-500"
                                        }`}
                                        style={{ width: `${(bookedClasses / 2) * 100}%` }}
                                    ></div>
                                </div>

                                <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                                    <span>Active: {mentor.active_from_ist} - {mentor.active_to_ist} IST</span>
                                    <span>Home: {mentor.timezone}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                    📋 Booked Trial Classes Ledger ({allBookings.length} Total)
                </h3>
                {allBookings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                        No trial classes booked yet. Go to the "Book Trial Class" tab to create your first booking!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-slate-900 uppercase font-bold text-[10px] border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Booking ID</th>
                                    <th className="py-3 px-4">Student</th>
                                    <th className="py-3 px-4">Subject</th>
                                    <th className="py-3 px-4">Assigned Mentor</th>
                                    <th className="py-3 px-4">Parent Local Time</th>
                                    <th className="py-3 px-4">Mentor Time (IST)</th>
                                    <th className="py-3 px-4">Live Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allBookings.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50/80">
                                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">{b.id}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-900">{b.student_name} ({b.student_age}y)</td>
                                        <td className="py-3 px-4">{b.course_interest}</td>
                                        <td className="py-3 px-4 font-medium text-slate-800">{b.mentor_name}</td>
                                        <td className="py-3 px-4 font-medium text-slate-600">{b.parent_display_time}</td>
                                        <td className="py-3 px-4 font-semibold text-emerald-700">{b.mentor_display_time}</td>
                                        <td className="py-3 px-4">
                                            <a
                                                href={b.demo_meeting_link}
                                                target="_blank"
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded text-[11px] inline-block border border-indigo-200"
                                            >
                                                Join Room 🚀
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmailSimulationView({ emails, loadEmails, setActiveMeetingRoom, setActiveTab }) {
    const [selectedEmail, setSelectedEmail] = useState(emails[0] || null);

    useEffect(() => {
        if (!selectedEmail && emails.length > 0) {
            setSelectedEmail(emails[0]);
        }
    }, [emails]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                        ✉️ Automated Notification Dispatcher
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Whenever a trial class is booked, our engine automatically emails both the Parent (in their local timezone) and the Mentor (in IST) with their dummy class link.
                    </p>
                </div>
                <button
                    onClick={loadEmails}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs"
                >
                    🔄 Refresh Inbox
                </button>
            </div>

            {emails.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 text-xs border border-slate-200">
                    No emails dispatched yet. Book a trial class to see live generated notification emails!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                            Dispatched Messages ({emails.length})
                        </div>
                        {emails.map(email => {
                            const isSelected = selectedEmail && selectedEmail.id === email.id;
                            const isParent = email.recipient_role === "parent";
                            return (
                                <button
                                    key={email.id}
                                    onClick={() => setSelectedEmail(email)}
                                    className={`w-full text-left p-3.5 rounded-xl transition flex flex-col gap-1 border ${
                                        isSelected
                                            ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400"
                                            : "bg-white hover:bg-slate-50 border-slate-200/70"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isParent ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            {isParent ? "👨‍👩‍👦 Parent Email" : "👨‍🏫 Mentor Email"}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(email.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 line-clamp-1">{email.subject}</div>
                                    <div className="text-[11px] text-slate-500">To: {email.recipient_email}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="md:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
                        {selectedEmail ? (
                            <div>
                                <div className="border-b border-slate-200 pb-4 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-400 font-mono font-semibold">{selectedEmail.id}</span>
                                        <span className="text-xs text-slate-500">{new Date(selectedEmail.sent_at).toLocaleString()}</span>
                                    </div>
                                    <h3 className="text-base font-extrabold text-slate-900">{selectedEmail.subject}</h3>
                                    <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1">
                                        <div><strong>Recipient:</strong> {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;</div>
                                        <div><strong>Booking Reference:</strong> {selectedEmail.booking_id}</div>
                                    </div>
                                </div>

                                <div
                                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                                ></div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400 text-xs">
                                Select an email from the list to preview.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function LiveClassroomView({ activeMeetingRoom, allBookings, setActiveTab }) {
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [messages, setMessages] = useState([
        { sender: "System", text: "Welcome to Codeyoung Virtual Classroom! Audio and Video streams connected.", time: "10:00 AM" },
        { sender: "Mentor", text: "Hello! Welcome to your trial coding session! Excited to code today.", time: "10:01 AM" }
    ]);
    const [chatInput, setChatInput] = useState("");

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setMessages([
            ...messages,
            { sender: "Student / Parent", text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        setChatInput("");
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                        <h2 className="text-xl font-extrabold text-white">
                            🎥 Codeyoung 1-on-1 Virtual Classroom
                        </h2>
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            LIVE DEMO
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Room ID: <span className="font-mono text-emerald-400 font-bold">{activeMeetingRoom?.room_id || "demo-room-live"}</span> • 60-Minute Interactive Coding Class
                    </p>
                </div>
                <button
                    onClick={() => setActiveTab("book")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition"
                >
                    ← Back to Booking System
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-800 rounded-2xl aspect-video relative overflow-hidden flex flex-col justify-between p-4 border border-slate-700 shadow-inner">
                            <div className="flex justify-between items-center text-xs">
                                <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded font-semibold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    👨‍🏫 Mentor Feed (India)
                                </span>
                                <span className="bg-indigo-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">1080p HD</span>
                            </div>
                            <div className="self-center text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-lg mb-2">
                                    AS
                                </div>
                                <div className="text-xs font-bold text-white">Aarav Sharma (Senior Mentor)</div>
                                <div className="text-[10px] text-slate-400">Speaking...</div>
                            </div>
                            <div className="text-[10px] text-slate-400">Audio: Connected • Latency: 42ms</div>
                        </div>

                        <div className="bg-slate-800 rounded-2xl aspect-video relative overflow-hidden flex flex-col justify-between p-4 border border-slate-700 shadow-inner">
                            <div className="flex justify-between items-center text-xs">
                                <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded font-semibold flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${camOn ? "bg-emerald-400" : "bg-rose-500"}`}></span>
                                    👦 Student Feed
                                </span>
                                {!camOn && <span className="text-rose-400 text-[10px] font-bold">Camera Off</span>}
                            </div>
                            <div className="self-center text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-lg mb-2">
                                    ST
                                </div>
                                <div className="text-xs font-bold text-white">Student (Young Coder)</div>
                            </div>
                            <div className="text-[10px] text-slate-400">Mic: {micOn ? "Active" : "Muted"}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">💻 Live Shared Coding Workspace</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Collaborative</span>
                            </div>
                            <button
                                onClick={() => alert("Simulation: Code output executed successfully in virtual sandbox!")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                            >
                                ▶ Run Code
                            </button>
                        </div>
                        <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                            <p className="text-slate-500"># Welcome to your first Python Trial Class with Codeyoung!</p>
                            <p className="text-slate-500"># Goal: Create a Superhero Game Character</p>
                            <p className="mt-2 text-indigo-300">hero_name = <span className="text-amber-300">"Captain Code"</span></p>
                            <p className="text-indigo-300">power_level = <span className="text-amber-300">100</span></p>
                            <p className="text-indigo-300">skills = [<span className="text-amber-300">"Logic"</span>, <span className="text-amber-300">"Loops"</span>, <span className="text-amber-300">"Creativity"</span>]</p>
                            <p className="mt-2 text-purple-300">print(<span className="text-emerald-300">f"✨ Hero {hero_name} is ready to explore programming!"</span>)</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-center gap-4 text-xs font-bold text-white shadow-md">
                        <button
                            onClick={() => setMicOn(!micOn)}
                            className={`p-3 rounded-xl transition flex items-center gap-2 ${
                                micOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-rose-600 text-white"
                            }`}
                        >
                            {micOn ? "🎙️ Mic On" : "🔇 Mic Muted"}
                        </button>
                        <button
                            onClick={() => setCamOn(!camOn)}
                            className={`p-3 rounded-xl transition flex items-center gap-2 ${
                                camOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-rose-600 text-white"
                            }`}
                        >
                            {camOn ? "📹 Cam On" : "🚫 Cam Off"}
                        </button>
                        <button
                            onClick={() => alert("Screen sharing mode initialized.")}
                            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition flex items-center gap-2"
                        >
                            🖥️ Share Screen
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Leave demo class room?")) setActiveTab("book");
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-xl transition flex items-center gap-2"
                        >
                            🔴 Leave Class
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[500px]">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                            <span>💬 In-Class Live Chat</span>
                            <span className="text-[10px] text-emerald-600 font-bold">🟢 Connected</span>
                        </h3>

                        <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1 text-xs">
                            {messages.map((m, i) => (
                                <div key={i} className={`p-3 rounded-xl ${
                                    m.sender === "Mentor"
                                        ? "bg-indigo-50 border border-indigo-100"
                                        : m.sender === "System"
                                        ? "bg-slate-100 text-slate-600 text-[11px]"
                                        : "bg-emerald-50 border border-emerald-100 text-slate-800 ml-4"
                                }`}>
                                    <div className="flex justify-between items-center font-bold text-[10px] text-slate-500 mb-1">
                                        <span>{m.sender}</span>
                                        <span>{m.time}</span>
                                    </div>
                                    <div>{m.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            placeholder="Type message to mentor..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
