'use strict';

// const { popup } = require("leaflet");



class Workut {

    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration){
        this.coords = coords;
        this.distance = distance; // In KM
        this.duration = duration; // In min
    }

    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click(){
        this.clicks++;
    };
}

class Running extends Workut {
    type = "running";

    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.type = "running";
        this.calcPace()
        this._setDescription();
    };

    calcPace(){
        // minutes/Km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workut {
    type = "cycling";
    constructor(coords, distance, duration, elevation){
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    };

    calcSpeed(){
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}



// const run1 = new Running([23, -12], 2, 5, 10);
// const ciclin1 = new Cycling([12, 22], 27, 95, 523);
// console.log(run1,ciclin1)

//////////////////////////////////////////////////
//APLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App{
    #map;
    #mapEvent;
    #mapZoomLevel = 12;
    #workouts = [];

    constructor(){
        this._getPosition();

        this._getLocalStorage();

        form.addEventListener('submit', this._newWorkut.bind(this));
        
        inputType.addEventListener("change", this._toggleElevationField.bind(this))

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    };

    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
                alert("Could not get your position")
            })
            }
    };

    _loadMap(position){
            const {latitude} = position.coords;
            const {longitude} = position.coords;
            // const url = `https://www.google.com.br/maps/@${latitude},${longitude}`;
            const coords = [latitude, longitude];
        
        
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
            
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
            
            // Aparece o ponto no mapa quando clico
                this.#map.on('click', this._showForm.bind(this)); 
            
                this.#workouts.forEach(work => {
                    this._renderWorkoutMarker(work);
                  });
        };

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove("hidden")
        inputDistance.focus();
    };

    _hideForm(){
        //Empty Inputs
        inputDistance.value = '', inputCadence.value = '',inputDuration.value = '', inputElevation.value = '';

        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => (form.style.display = "grid"), 1000)
    }

    _toggleElevationField(){
            inputElevation.closest('.form__row').classList.toggle("form__row--hidden");
            inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    };

    _newWorkut(e){

        const validInp = (...inputs) => inputs.every(inp => Number.isFinite(inp));

        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();
        //Get date from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const latIng = this.#mapEvent.latlng
        let workout;
        
        //If active running
        if(type === "running"){
            const cadence = +inputCadence.value;
            //Check date is valid
            if(
             !validInp(distance, duration, cadence) ||
             !allPositive(distance, duration, cadence)
             ) return alert("Inputs have to be positive numbers");

             workout = new Running(latIng,distance,duration,cadence);
    
        };

        //If active cycling
        if(type === "cycling"){
            const elevation = +inputElevation.value;

            if(
                !validInp(distance, duration, elevation) ||
                !allPositive(distance, duration, elevation)
            ) return alert("Inputs have to be positive numbers");

            workout = new Cycling(latIng,distance,duration,elevation);
        };

        //Add new object to workut array
        this.#workouts.push(workout);
        console.log(workout)
        
        //Display 
        this._renderWorkoutMarker(workout);
                
        // Render workut on list
        this._renderWorkout(workout);

        //Hide form + clear
        this._hideForm();

        //Storage local

        this._setLocalStorage();
    };


    _renderWorkoutMarker(workout){
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                autoClose: false,
                maxWidth: 250,
                minWidth: 100,
                closeOnClick:false,
                className: `${workout.type}-popup`
            })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout){
        

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running'){
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
             </li>`;
        };

        if(workout.type === 'cycling'){
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>`;
        };

        form.insertAdjacentHTML("afterend", html);

    }

    _moveToPopup(e){
        const workouEl = e.target.closest(".workout");
        console.log(workouEl)

        if(!workouEl) return;

        const workout = this.#workouts.find(work => work.id === workouEl.dataset.id);

        console.log(workout);

        this.#map.setView(workout.coords,this.#mapZoomLevel, {
            animamete: true,
            pan: {
                duration: 1,
            }
        });

        //Using the public interface

        // Workut.click;
    }

    _setLocalStorage(){
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem("workouts"));

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
          this._renderWorkout(work);
        });
        
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
};

const app = new App();





