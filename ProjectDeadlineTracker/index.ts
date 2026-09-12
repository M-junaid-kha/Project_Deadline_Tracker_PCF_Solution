import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class ProjectDeadlineTracker
    implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container: HTMLDivElement;
    private notifyOutputChanged: () => void;

    private slider: HTMLInputElement;
    private progressLabel: HTMLDivElement;
    private deadlineLabel: HTMLDivElement;
    private timeLeftLabel: HTMLDivElement;
    private projectNameLabel: HTMLDivElement;

    private completedCheckbox: HTMLInputElement;
    private completedLabel: HTMLLabelElement;

    private progress = 0;
    private isCompleted = false;

    // ==========================================================
    // PREVENT updateView() FROM OVERWRITING USER CHANGES
    // ==========================================================

    private pendingProgress: number | null = null;
    private pendingIsCompleted: boolean | null = null;

    private countdownTimer: number | undefined;
    private deadline: Date | null = null;

    private static readonly STYLE_ID = "pdt-modern-styles";

    // ==========================================================
    // CONSTRUCTOR
    // ==========================================================

    constructor() {
        // Constructor
    }

    // ==========================================================
    // INJECT MODERN STYLES (ONCE PER PAGE)
    // ==========================================================

    private injectStyles(): void {

        if (document.getElementById(ProjectDeadlineTracker.STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = ProjectDeadlineTracker.STYLE_ID;

        style.innerHTML = `
            .pdt-card {
                background: linear-gradient(145deg, #ffffff, #f8f9ff);
                border: 1px solid #e6e8f0;
                border-radius: 16px;
                padding: 20px;
                box-sizing: border-box;
                box-shadow: 0 1px 2px rgba(16,24,40,0.04), 0 8px 20px rgba(16,24,40,0.06);
                position: relative;
                overflow: hidden;
                transition: box-shadow .25s ease, transform .25s ease;
            }

            .pdt-card::before {
                content: "";
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 4px;
                background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
            }

            .pdt-header-block {
                margin-bottom: 18px;
            }

            .pdt-title {
                font-size: 18px;
                font-weight: 700;
                color: #1e1b3a;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .pdt-project-name {
                font-size: 13px;
                font-weight: 600;
                color: #6366f1;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .pdt-progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .pdt-progress-text {
                font-size: 12px;
                font-weight: 700;
                letter-spacing: .06em;
                text-transform: uppercase;
                color: #94a3b8;
            }

            .pdt-progress-value {
                font-size: 17px;
                font-weight: 800;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
            }

            .pdt-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 8px;
                border-radius: 999px;
                outline: none;
                margin: 6px 0 18px 0;
                cursor: pointer;
                transition: background .15s ease;
            }

            .pdt-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                border: 3px solid #6366f1;
                box-shadow: 0 2px 6px rgba(99,102,241,0.45);
                cursor: pointer;
                transition: transform .15s ease;
            }

            .pdt-slider::-webkit-slider-thumb:hover {
                transform: scale(1.15);
            }

            .pdt-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                border: 3px solid #6366f1;
                box-shadow: 0 2px 6px rgba(99,102,241,0.45);
                cursor: pointer;
            }

            .pdt-slider::-moz-range-track {
                background: transparent;
                height: 8px;
                border-radius: 999px;
            }

            .pdt-deadline-box {
                background: linear-gradient(135deg, #f8fafc, #eef2ff);
                border: 1px solid #e0e7ff;
                border-radius: 12px;
                padding: 14px 16px;
                margin-top: 6px;
            }

            .pdt-deadline-row {
                font-size: 14px;
                font-weight: 600;
                color: #334155;
            }

            .pdt-time-left-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: 10px;
                padding: 4px 12px;
                border-radius: 999px;
                font-size: 13px;
                font-weight: 700;
            }

            .pdt-badge-neutral { background: #f1f5f9; color: #64748b; }
            .pdt-badge-good    { background: #dcfce7; color: #15803d; }
            .pdt-badge-warning { background: #ffedd5; color: #c2410c; }
            .pdt-badge-danger  { background: #fee2e2; color: #b91c1c; }
            .pdt-badge-success { background: #dcfce7; color: #15803d; }

            .pdt-completed-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 18px;
                padding-top: 14px;
                border-top: 1px solid #edebe9;
            }

            .pdt-toggle {
                position: relative;
                display: inline-flex;
                width: 42px;
                height: 24px;
                flex-shrink: 0;
                cursor: pointer;
            }

            .pdt-toggle-input {
                position: absolute;
                inset: 0;
                opacity: 0;
                margin: 0;
                cursor: pointer;
                z-index: 2;
            }

            .pdt-toggle-track {
                position: absolute;
                inset: 0;
                background: #e2e8f0;
                border-radius: 999px;
                transition: background .25s ease;
            }

            .pdt-toggle-thumb {
                position: absolute;
                top: 3px;
                left: 3px;
                width: 18px;
                height: 18px;
                background: #ffffff;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                transition: transform .25s ease;
            }

            .pdt-toggle-input:checked + .pdt-toggle-track {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
            }

            .pdt-toggle-input:checked + .pdt-toggle-track .pdt-toggle-thumb {
                transform: translateX(18px);
            }

            .pdt-toggle-input:focus-visible + .pdt-toggle-track {
                box-shadow: 0 0 0 3px rgba(99,102,241,0.35);
            }

            .pdt-completed-label {
                font-size: 14px;
                font-weight: 600;
                color: #323130;
                cursor: pointer;
            }
        `;

        document.head.appendChild(style);
    }

    // ==========================================================
    // INITIALIZE CONTROL
    // ==========================================================

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        this.injectStyles();

        // ======================================================
        // MAIN CONTAINER
        // ======================================================

        this.container.style.fontFamily =
            "Inter, 'Segoe UI', Arial, sans-serif";

        this.container.style.boxSizing =
            "border-box";

        this.container.style.width =
            "100%";

        // ======================================================
        // MAIN CARD
        // ======================================================

        const card =
            document.createElement("div");

        card.className = "pdt-card";

        // ======================================================
        // HEADER BLOCK (TITLE + PROJECT NAME)
        // ======================================================

        const headerBlock =
            document.createElement("div");

        headerBlock.className = "pdt-header-block";

        // ======================================================
        // TITLE
        // ======================================================

        const title =
            document.createElement("div");

        title.innerText =
            "📊 Project Progress";

        title.className = "pdt-title";

        // ======================================================
        // PROJECT NAME
        // ======================================================

        this.projectNameLabel =
            document.createElement("div");

        this.projectNameLabel.innerText =
            "📁 No project selected";

        this.projectNameLabel.className = "pdt-project-name";

        headerBlock.appendChild(
            title
        );

        headerBlock.appendChild(
            this.projectNameLabel
        );

        // ======================================================
        // PROGRESS HEADER
        // ======================================================

        const progressHeader =
            document.createElement("div");

        progressHeader.className = "pdt-progress-header";

        // ======================================================
        // PROGRESS TEXT
        // ======================================================

        const progressText =
            document.createElement("span");

        progressText.innerText =
            "Progress";

        progressText.className = "pdt-progress-text";

        // ======================================================
        // PROGRESS LABEL
        // ======================================================

        this.progressLabel =
            document.createElement("div");

        this.progressLabel.innerText =
            "0%";

        this.progressLabel.className = "pdt-progress-value";

        progressHeader.appendChild(
            progressText
        );

        progressHeader.appendChild(
            this.progressLabel
        );

        // ======================================================
        // SLIDER
        // ======================================================

        this.slider =
            document.createElement("input");

        this.slider.type =
            "range";

        this.slider.min =
            "0";

        this.slider.max =
            "100";

        this.slider.step =
            "1";

        this.slider.value =
            "0";

        this.slider.className = "pdt-slider";

        // ======================================================
        // DEADLINE BOX
        // ======================================================

        const deadlineBox =
            document.createElement("div");

        deadlineBox.className = "pdt-deadline-box";

        // ======================================================
        // DEADLINE LABEL
        // ======================================================

        this.deadlineLabel =
            document.createElement("div");

        this.deadlineLabel.innerText =
            "📅 Project Deadline: Not set";

        this.deadlineLabel.className = "pdt-deadline-row";

        // ======================================================
        // TIME LEFT LABEL
        // ======================================================

        this.timeLeftLabel =
            document.createElement("div");

        this.timeLeftLabel.innerText =
            "⏳ Time Left: Not available";

        this.timeLeftLabel.className = "pdt-time-left-badge pdt-badge-neutral";

        deadlineBox.appendChild(
            this.deadlineLabel
        );

        deadlineBox.appendChild(
            this.timeLeftLabel
        );

        // ======================================================
        // COMPLETED ROW (MODERN TOGGLE)
        // ======================================================

        const completedContainer =
            document.createElement("div");

        completedContainer.className = "pdt-completed-row";

        const toggleWrapper =
            document.createElement("label");

        toggleWrapper.className = "pdt-toggle";

        // ======================================================
        // CHECKBOX (VISUALLY HIDDEN, STILL FUNCTIONAL)
        // ======================================================

        this.completedCheckbox =
            document.createElement("input");

        this.completedCheckbox.type =
            "checkbox";

        this.completedCheckbox.id =
            "projectCompletedCheckbox";

        this.completedCheckbox.className = "pdt-toggle-input";

        const toggleTrack =
            document.createElement("span");

        toggleTrack.className = "pdt-toggle-track";

        const toggleThumb =
            document.createElement("span");

        toggleThumb.className = "pdt-toggle-thumb";

        toggleTrack.appendChild(
            toggleThumb
        );

        toggleWrapper.appendChild(
            this.completedCheckbox
        );

        toggleWrapper.appendChild(
            toggleTrack
        );

        // ======================================================
        // CHECKBOX LABEL
        // ======================================================

        this.completedLabel =
            document.createElement("label");

        this.completedLabel.htmlFor =
            "projectCompletedCheckbox";

        this.completedLabel.innerText =
            "Project Completed";

        this.completedLabel.className = "pdt-completed-label";

        completedContainer.appendChild(
            toggleWrapper
        );

        completedContainer.appendChild(
            this.completedLabel
        );

        // ======================================================
        // ADD EVERYTHING TO CARD
        // ======================================================

        card.appendChild(
            headerBlock
        );

        card.appendChild(
            progressHeader
        );

        card.appendChild(
            this.slider
        );

        card.appendChild(
            deadlineBox
        );

        card.appendChild(
            completedContainer
        );

        // ======================================================
        // ADD CARD TO PCF
        // ======================================================

        this.container.appendChild(
            card
        );

        // ======================================================
        // INITIAL SLIDER FILL
        // ======================================================

        this.updateSliderFill();

        // ======================================================
        // SLIDER EVENT
        // ======================================================

        this.slider.addEventListener(
            "input",
            this.onSliderChange
        );

        // ======================================================
        // CHECKBOX EVENT
        // ======================================================

        this.completedCheckbox.addEventListener(
            "change",
            this.onCompletedChange
        );
    }

    // ==========================================================
    // UPDATE SLIDER GRADIENT FILL
    // ==========================================================

    private updateSliderFill(): void {

        if (!this.slider) {
            return;
        }

        const pct = this.progress;

        this.slider.style.background =
            `linear-gradient(to right, #6366f1 0%, #8b5cf6 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
    }

    // ==========================================================
    // APPLY TIME LEFT BADGE STATE
    // ==========================================================

    private setTimeLeftState(
        text: string,
        state: "neutral" | "good" | "warning" | "danger" | "success"
    ): void {

        this.timeLeftLabel.innerText = text;
        this.timeLeftLabel.className = `pdt-time-left-badge pdt-badge-${state}`;
    }

    // ==========================================================
    // SLIDER CHANGE
    // ==========================================================

    private onSliderChange = (
        event: Event
    ): void => {

        const target =
            event.target as HTMLInputElement;

        this.progress =
            Number(target.value);

        // ======================================================
        // REMEMBER USER CHANGE
        // ======================================================

        this.pendingProgress =
            this.progress;

        // ======================================================
        // UPDATE PROGRESS LABEL
        // ======================================================

        this.progressLabel.innerText =
            `${this.progress}%`;

        // ======================================================
        // UPDATE SLIDER FILL
        // ======================================================

        this.updateSliderFill();

        // ======================================================
        // TELL POWER APPS
        // ======================================================

        this.notifyOutputChanged();
    };

    // ==========================================================
    // CHECKBOX CHANGE
    // ==========================================================

    private onCompletedChange = (
        event: Event
    ): void => {

        const target =
            event.target as HTMLInputElement;

        this.isCompleted =
            target.checked;

        // ======================================================
        // PROJECT COMPLETED
        // ======================================================

        if (this.isCompleted) {

            // Automatically set progress to 100%
            this.progress = 100;

            // Tell updateView() that 100%
            // is our local change
            this.pendingProgress = 100;

            // Move slider to 100%
            this.slider.value = "100";

            // Update progress label
            this.progressLabel.innerText =
                "100%";

            // Update slider fill
            this.updateSliderFill();
        }

        // ======================================================
        // REMEMBER CHECKBOX CHANGE
        // ======================================================

        this.pendingIsCompleted =
            this.isCompleted;

        // ======================================================
        // UPDATE TIME LEFT
        // ======================================================

        this.updateTimeLeft();

        // ======================================================
        // TELL POWER APPS
        // ======================================================

        this.notifyOutputChanged();
    };

    // ==========================================================
    // UPDATE VIEW
    // ==========================================================

    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): void {

        // ======================================================
        // GET PROJECT NAME
        // ======================================================

        const projectNameValue =
            context.parameters.projectName.raw;

        if (this.projectNameLabel) {

            this.projectNameLabel.innerText =
                projectNameValue && projectNameValue.trim().length > 0
                    ? `📁 ${projectNameValue}`
                    : "📁 No project selected";
        }

        // ======================================================
        // GET PROGRESS FROM DATAVERSE
        // ======================================================

        const progressValue =
            context.parameters.progress.raw;

        // ======================================================
        // UPDATE LOCAL PROGRESS
        // ======================================================

        if (
            this.pendingProgress === null &&
            progressValue !== null &&
            progressValue !== undefined
        ) {

            this.progress =
                progressValue;
        }

        // ======================================================
        // CONFIRM PENDING PROGRESS
        // ======================================================

        if (
            this.pendingProgress !== null &&
            progressValue === this.pendingProgress
        ) {

            this.pendingProgress =
                null;
        }

        // ======================================================
        // UPDATE SLIDER
        // ======================================================

        if (this.slider) {

            this.slider.value =
                this.progress.toString();

            this.updateSliderFill();
        }

        // ======================================================
        // UPDATE PROGRESS LABEL
        // ======================================================

        if (this.progressLabel) {

            this.progressLabel.innerText =
                `${this.progress}%`;
        }

        // ======================================================
        // GET COMPLETED
        // ======================================================

        const completedValue =
            context.parameters.isCompleted.raw;

        // ======================================================
        // UPDATE LOCAL COMPLETED VALUE
        // ======================================================

        if (
            this.pendingIsCompleted === null &&
            completedValue !== null &&
            completedValue !== undefined
        ) {

            this.isCompleted =
                completedValue;
        }

        // ======================================================
        // CONFIRM PENDING COMPLETED VALUE
        // ======================================================

        if (
            this.pendingIsCompleted !== null &&
            completedValue === this.pendingIsCompleted
        ) {

            this.pendingIsCompleted =
                null;
        }

        // ======================================================
        // IF COMPLETED FROM DATAVERSE
        // ======================================================

        if (this.isCompleted) {

            // If Dataverse says completed,
            // make sure progress is 100%.

            if (
                this.pendingProgress === null &&
                this.progress !== 100
            ) {

                this.progress = 100;

                this.pendingProgress = 100;

                this.notifyOutputChanged();
            }
        }

        // ======================================================
        // UPDATE CHECKBOX
        // ======================================================

        if (this.completedCheckbox) {

            this.completedCheckbox.checked =
                this.isCompleted;
        }

        // ======================================================
        // UPDATE SLIDER AGAIN
        // ======================================================

        if (this.slider) {

            this.slider.value =
                this.progress.toString();

            this.updateSliderFill();
        }

        // ======================================================
        // UPDATE PROGRESS LABEL AGAIN
        // ======================================================

        if (this.progressLabel) {

            this.progressLabel.innerText =
                `${this.progress}%`;
        }

        // ======================================================
        // GET DEADLINE
        // ======================================================

        const deadline =
            context.parameters.deadline.raw;

        // ======================================================
        // UPDATE DEADLINE
        // ======================================================

        if (deadline) {

            const newDeadline =
                new Date(deadline);

            // ==================================================
            // CHECK IF DEADLINE CHANGED
            // ==================================================

            const deadlineChanged =
                !this.deadline ||
                this.deadline.getTime() !==
                newDeadline.getTime();

            this.deadline =
                newDeadline;

            // ==================================================
            // DISPLAY DEADLINE
            // ==================================================

            this.deadlineLabel.innerText =
                `📅 Project Deadline: ${
                    this.deadline.toLocaleDateString()
                }`;

            // ==================================================
            // UPDATE TIME LEFT
            // ==================================================

            this.updateTimeLeft();

            // ==================================================
            // CLEAR OLD TIMER
            // ==================================================

            if (
                deadlineChanged &&
                this.countdownTimer !== undefined
            ) {

                window.clearInterval(
                    this.countdownTimer
                );

                this.countdownTimer =
                    undefined;
            }

            // ==================================================
            // START TIMER
            // ==================================================

            if (
                this.countdownTimer === undefined
            ) {

                this.countdownTimer =
                    window.setInterval(
                        () => {
                            this.updateTimeLeft();
                        },
                        60000
                    );
            }

        } else {

            // ==================================================
            // NO DEADLINE
            // ==================================================

            this.deadline =
                null;

            this.deadlineLabel.innerText =
                "📅 Project Deadline: Not set";

            this.setTimeLeftState(
                "⏳ Time Left: Not available",
                "neutral"
            );

            // ==================================================
            // STOP TIMER
            // ==================================================

            if (
                this.countdownTimer !== undefined
            ) {

                window.clearInterval(
                    this.countdownTimer
                );

                this.countdownTimer =
                    undefined;
            }
        }
    }

    // ==========================================================
    // CALCULATE TIME LEFT
    // ==========================================================

    private updateTimeLeft = (): void => {

        // ======================================================
        // NO DEADLINE
        // ======================================================

        if (!this.deadline) {

            this.setTimeLeftState(
                "⏳ Time Left: Not available",
                "neutral"
            );

            return;
        }

        // ======================================================
        // COMPLETED
        // ======================================================

        if (this.isCompleted) {

            this.setTimeLeftState(
                "✅ Project Completed",
                "success"
            );

            return;
        }

        // ======================================================
        // CURRENT TIME
        // ======================================================

        const now =
            new Date();

        // ======================================================
        // DIFFERENCE
        // ======================================================

        const difference =
            this.deadline.getTime() -
            now.getTime();

        // ======================================================
        // OVERDUE
        // ======================================================

        if (difference <= 0) {

            const overdue =
                Math.abs(difference);

            const days =
                Math.floor(
                    overdue /
                    (1000 * 60 * 60 * 24)
                );

            const hours =
                Math.floor(
                    (
                        overdue %
                        (1000 * 60 * 60 * 24)
                    ) /
                    (1000 * 60 * 60)
                );

            const minutes =
                Math.floor(
                    (
                        overdue %
                        (1000 * 60 * 60)
                    ) /
                    (1000 * 60)
                );

            this.setTimeLeftState(
                `⚠️ Overdue by ${days} Days ${hours} Hours ${minutes} Minutes`,
                "danger"
            );

            return;
        }

        // ======================================================
        // REMAINING TIME
        // ======================================================

        const days =
            Math.floor(
                difference /
                (1000 * 60 * 60 * 24)
            );

        const hours =
            Math.floor(
                (
                    difference %
                    (1000 * 60 * 60 * 24)
                ) /
                (1000 * 60 * 60)
            );

        const minutes =
            Math.floor(
                (
                    difference %
                    (1000 * 60 * 60)
                ) /
                (1000 * 60)
            );

        const text =
            `⏳ Time Left: ${days} Days ${hours} Hours ${minutes} Minutes`;

        // ======================================================
        // DEADLINE URGENCY STATE
        // ======================================================

        if (days <= 2) {

            this.setTimeLeftState(text, "danger");

        } else if (days <= 7) {

            this.setTimeLeftState(text, "warning");

        } else {

            this.setTimeLeftState(text, "good");
        }
    };

    // ==========================================================
    // SEND VALUES TO DATAVERSE
    // ==========================================================

    public getOutputs(): IOutputs {

        return {

            progress:
                this.progress,

            isCompleted:
                this.isCompleted
        };
    }

    // ==========================================================
    // CLEANUP
    // ==========================================================

    public destroy(): void {

        // ======================================================
        // REMOVE SLIDER EVENT
        // ======================================================

        if (this.slider) {

            this.slider.removeEventListener(
                "input",
                this.onSliderChange
            );
        }

        // ======================================================
        // REMOVE CHECKBOX EVENT
        // ======================================================

        if (this.completedCheckbox) {

            this.completedCheckbox.removeEventListener(
                "change",
                this.onCompletedChange
            );
        }

        // ======================================================
        // STOP TIMER
        // ======================================================

        if (
            this.countdownTimer !== undefined
        ) {

            window.clearInterval(
                this.countdownTimer
            );

            this.countdownTimer =
                undefined;
        }
    }
}