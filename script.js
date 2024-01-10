'use strict';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);

    constructor(distance, duration, coords) {
        this.distance = distance; //in km
        this.duration = duration; //in min
        this.coords = coords; // [lat, lng]
    }

    getString(type) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let month = months[this.date.getMonth()];
        let day = this.date.getDate();
        this.string = `${type[0].toUpperCase() + type.slice(1)} on ${month} ${day}`;
    }
}

class Running extends Workout {
    type = "running";

    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence;
        this.getPace();
        this.getString(this.type);
    }

    getPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords);
        this.elevationGain = elevationGain;
        this.getSpeed();
        this.getString(this.type);
    }

    getSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        navigator.geolocation.getCurrentPosition(this._getPosition.bind(this), this.error);

        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this.moveToWorkout.bind(this));

        this.#loadLocalStorage();
    }

    error() {
        alert("ERROR: coud not take get position, allow the browser to get it to start using the application");
    }

    _getPosition(position) {
        let { latitude, longitude } = position.coords;
        let coords = [latitude, longitude];
        this._loadMap(coords);
    }

    _loadMap(position) {
        this.#map = L.map('map').setView(position, 15);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on("click", this._showForm.bind(this));
        this.#workouts.forEach(workout => this.displayMarker(workout));
    }

    _showForm(e) {
        this.#mapEvent = e;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm(e) {
        this.#mapEvent = e;
        form.style.display = "none";
        form.classList.add("hidden");

        setTimeout(() => {
            form.style.display = "grid";
        }, 500);
    }

    _toggleElevationField() {
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _newWorkout(e) {
        e.preventDefault();
        let validDatas = function (...datas) {
            return datas.every(data => Number.isFinite(data));
        }

        let allPositive = function (...datas) {
            return datas.every(data => data > 0);
        }

        let { lat, lng } = this.#mapEvent.latlng;

        //Get values from the form
        let type = inputType.value;
        let distance = +inputDistance.value;
        let duration = +inputDuration.value;
        let workout;

        if (type == "running") {
            let cadence = +inputCadence.value;
            //Check if the datas are valid
            if (!validDatas(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert("ONLY POSITIVE NUMBERS");

            workout = new Running(distance, duration, [lat, lng], cadence);
        }

        if (type == "cycling") {
            let elevation = +inputElevation.value;
            //Check if the datas are valid, if so create a workout object
            if (!validDatas(distance, duration, elevation) || !allPositive(distance, duration))
                return alert("ONLY POSITIVE NUMBERS");

            workout = new Cycling(distance, duration, [lat, lng], elevation);
        }

        //Add the workout object to the list
        this.#workouts.push(workout);

        //Display workout marker on the map
        this.displayMarker(workout);

        //Display workout on the list
        this.displayWorkout(workout);

        //Clear and hide the form
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        this._hideForm();

        //Save workout to local storage
        this.#saveLocalStorage();
    }

    displayMarker(workout) {
        let popupOptions = { autoClose: false, closeOnClick: false, className: `${workout.type}-popup` };

        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup(popupOptions))
            .bindPopup(workout.string)
            .openPopup();
    }

    displayWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.string}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type == "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if (workout.type == "running") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        }

        if (workout.type == "cycling") {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;
        }

        form.insertAdjacentHTML("afterend", html);
    }

    moveToWorkout(e) {
        let target = e.target.closest(".workout");
        if (!target) return;
        //Get the id from the workout
        let id = target.dataset.id;

        //Find the workout with the corrisponding id
        let workout = this.#workouts.find(workout => workout.id == id);

        //Get the coords from the workout
        let coords = workout.coords;

        //Move to the coords
        this.#map.setView(coords, 15, { animation: true });
    }

    #saveLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    #loadLocalStorage() {
        let data = JSON.parse(localStorage.getItem("workouts"));
        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(workout => this.displayWorkout(workout));
    }

    reset() {
        localStorage.clear();
        location.reload();
    }

}

let app = new App();



