
TARGETS = jjp/static/jquery.js jjp/static/react.js jjp/static/react.min.js jjp/static/build

all: $(TARGETS)

clean:
	rm -rf $(TARGETS)

.DELETE_ON_ERROR:

.PHONY: all jjp/static/build

jjp/static/build:
	if ! [ -f ./node_modules/.bin/jsx ]; then npm install react-tools@0.10.0; fi
	./node_modules/.bin/jsx jjp/static/src jjp/static/build
jjp/static/jquery.js:
	wget -O $@ http://code.jquery.com/jquery-1.11.0.min.js
jjp/static/react.js:
	wget -O $@ http://fb.me/react-0.10.0.js
jjp/static/react.min.js:
	wget -O $@ http://fb.me/react-0.10.0.min.js
