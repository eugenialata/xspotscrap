# GoogleMapsCrawler

## Installation and setup

### MAC OSX and LINUX

1. Open terminal

2. Clone the github repository
```sh
git clone git@github.com:eugenialata/xspotscrap.git
```
if you are having troble with ssh. Try using https(Note: this will require you to enter your github credentials on terminal)
```sh
git clone https://github.com/eugenialata/xspotscrap
```
3. Navigate inside the project directory
```sh
cd xspotscrap
```
4. Install requirements for Nodejs(This will take sometime)
```sh
npm install
```
5. Install requirements for python
```sh
pip install -r requirements.txt
```

## Doing a Crawl
1. Make sure you have updated the `input.csv` file.
2. Open terminal
3. Navigate inside the project directory.
```sh
cd xspotscrap
```
4. Run the crawler
```sh
node maps_scraper.js
```

5. After the crawler is finished. Export the report
```sh
python generate_data.py
```

## Understanding the Project
#### These are the main files that you as a user should be familiar with

1. `input.csv`
This is the file that will store the google places search keywords. Enter the keywords seperated by new line. For example
![input file](https://i.ibb.co/P4HGWR7/On-Paste-20200109-212026.png)

2. `data_delivery` Folder.
This will contain the scraped data organised by the scraped date.
![data delivery folder](https://i.ibb.co/QrrZjHw/image.png)

