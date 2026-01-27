
# Objective 
The objective of this project is to update my personal website that displays the different art and technology projects I have done over the years. 

## Issues to solve

### Technical issues
* Currently the website is not mobile friendly
* The website is hand-crafted. Every time I want to add a new item to the website, I need to go in and change the HTML code directly.

### Design issues
* The front page is currently "blank" with just a slowly shifting gradient. I would like to add an animation or interactive element.
* Technical and Art projects should be in time order. It is hard for viewers to know what the latest projects are

# Website Design
I propose a design that is as follows.

The front page of the website will display ASCII stars (*) animated as point masses moving around the page according to gravitational laws. All point masses affect each other's trajectories resulting in flowing motion. 

![Front Page Drawing](drawings_concept.png)

* The __background__ gradient colors wil be similar to the old website simulating a sky moving from day to night to day. But now the colors will go through a more thorough "night" phase.
* The __stars__ will each represent and link to one project on the website. Their ASCII character will represent either (*) for art project or (O) for technical project.
* One object, slightly larger than the other ones will be the __sphere__ which will link to the about page.
* All objects will change in color as the background changes to make sure they are visible. The objects will be lighter colored at night (to look like celestial objects) and darker in the daytime (darker objects against a lighter background).
* When the mouse hovers over an item moving around (thus "catching" it) the object will stop and display an icon to represent the project. Clicking on the object will open up a gallery to display the object.
* There will still be a "menu" like the current design which shows three options:

                                ART / TECH / ABOUT

    * Clicking the about page will simply transition you to the "about" page with information about me (similar to the current about page)
    * Clicking the "ART" or "TECH" tabs will result in only the corresponding "ART" or "TECH" objects fading away and the appropriate objects will line up in chronological order leading you to a "gallery" in which you can view the different projects (similarly to how the website works now).


# Technical Approach
I would like to build the structure of this website once, and then be able to add/remove/reorganize content easily without restructuring it. The approach we can take is to set up a file structure (similarly to what exists now) which includes images and markdown files and then auto-generate the website by running a python script.

```
projects -- art -- project_1 -- project_description1.md
         |                  |-- image1.png
         |                  |-- image2.png
         |
         ...
         |-- tech -- project_2 -- project_description2.md
         |                  |-- image1.png
         |                  |-- image2.png
         '''
```

Adding content should be as easy as adding some files to the file structure, running a python script, opening a pr reviewing and pushing (without changing too much of the core code).

# Execution Plan
The creation of the new website should happen in the following steps, stopping at each to test the new functionality manually and adding a commit at each step of the way.

[] Changing nothing about the current website design, build the file structure and python script that allows the re-creation of the website by adding/deleting/moving files.
[] Make the website mobile friendly so it displays well on an iphone
[] Add the front-page design animations

