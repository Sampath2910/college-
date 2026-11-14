-- Reference data only. No project records are seeded: the catalogue is filled by discovery.
SET @now = UTC_TIMESTAMP(6);

INSERT INTO roles (name) VALUES ('ADMIN'), ('STUDENT');
INSERT INTO permissions (name, description) VALUES
 ('catalogue.manage',  'Review, edit and publish projects'),
 ('discovery.manage',  'Run and configure discovery jobs'),
 ('enquiries.manage',  'View and manage student enquiries'),
 ('engagement.manage', 'View interest insights and manage message drafts'),
 ('settings.manage',   'Change integrations and system settings'),
 ('student.self',      'Access own dashboard, saved projects and enquiries');
INSERT INTO role_permissions (role_id, permission_id)
 SELECT r.id, p.id FROM roles r JOIN permissions p
 WHERE (r.name = 'ADMIN' AND p.name <> 'student.self') OR (r.name = 'STUDENT' AND p.name = 'student.self');

INSERT INTO source_platforms (code, name, base_url, created_at, updated_at) VALUES
 ('GITHUB', 'GitHub', 'https://github.com', @now, @now),
 ('KAGGLE', 'Kaggle', 'https://www.kaggle.com', @now, @now);

INSERT INTO integrations (code, name, created_at, updated_at) VALUES
 ('GITHUB', 'GitHub', @now, @now), ('KAGGLE', 'Kaggle', @now, @now), ('AI', 'AI provider', @now, @now),
 ('EMAIL', 'Email (Resend)', @now, @now), ('WHATSAPP', 'WhatsApp Business', @now, @now);

INSERT INTO licences (spdx_id, name, url, created_at, updated_at) VALUES
 ('MIT', 'MIT License', 'https://spdx.org/licenses/MIT.html', @now, @now),
 ('Apache-2.0', 'Apache License 2.0', 'https://spdx.org/licenses/Apache-2.0.html', @now, @now),
 ('GPL-3.0', 'GNU General Public License v3.0', 'https://spdx.org/licenses/GPL-3.0-only.html', @now, @now),
 ('BSD-3-Clause', 'BSD 3-Clause License', 'https://spdx.org/licenses/BSD-3-Clause.html', @now, @now);
-- further licences are added automatically as sources report them

INSERT INTO categories (name, slug, description, keywords, sort_order, created_at, updated_at) VALUES
 ('Artificial Intelligence', 'artificial-intelligence', 'Agents, search, reasoning and applied AI systems.', 'artificial-intelligence,ai,llm,chatbot,generative-ai,agents,rag,expert-system', 1, @now, @now),
 ('Machine Learning', 'machine-learning', 'Classification, regression, clustering and recommender projects.', 'machine-learning,ml,scikit-learn,sklearn,classification,regression,recommender-system,prediction,xgboost', 2, @now, @now),
 ('Deep Learning', 'deep-learning', 'Neural-network projects built with modern frameworks.', 'deep-learning,neural-network,cnn,rnn,lstm,transformer,gan,pytorch,tensorflow,keras', 3, @now, @now),
 ('Data Science', 'data-science', 'End-to-end analysis, modelling and exploration work.', 'data-science,eda,exploratory-data-analysis,pandas,jupyter,jupyter-notebook,statistics', 4, @now, @now),
 ('Web Development', 'web-development', 'Websites and web applications.', 'web,website,html,css,javascript,frontend,react,vue,angular,php,django,flask,web-development,webapp', 5, @now, @now),
 ('Full Stack Development', 'full-stack-development', 'Applications with a frontend, backend and database.', 'full-stack,fullstack,mern,mean,mern-stack,nextjs,rest-api,e-commerce,ecommerce', 6, @now, @now),
 ('Java Development', 'java-development', 'Java, Spring Boot and JVM applications.', 'java,spring,spring-boot,springboot,hibernate,jsp,servlet,maven,jdbc,swing,javafx', 7, @now, @now),
 ('Python Development', 'python-development', 'General Python applications and tools.', 'python,python3,tkinter,pygame,fastapi,cli', 8, @now, @now),
 ('Mobile Application Development', 'mobile-application-development', 'Cross-platform and native mobile apps.', 'mobile,mobile-app,react-native,ios,swift,ionic,xamarin', 9, @now, @now),
 ('Android Development', 'android-development', 'Native Android applications.', 'android,android-app,kotlin,android-studio,jetpack-compose', 10, @now, @now),
 ('Flutter', 'flutter', 'Flutter and Dart applications.', 'flutter,dart,flutter-app', 11, @now, @now),
 ('Cloud Computing', 'cloud-computing', 'Cloud-native, serverless and infrastructure projects.', 'cloud,aws,azure,gcp,serverless,kubernetes,docker,devops,terraform,microservices', 12, @now, @now),
 ('Cybersecurity', 'cybersecurity', 'Security tooling, cryptography and network defence.', 'security,cybersecurity,cyber-security,cryptography,encryption,penetration-testing,malware,intrusion-detection,steganography,network-security', 13, @now, @now),
 ('Internet of Things', 'internet-of-things', 'Sensor, embedded and connected-device projects.', 'iot,internet-of-things,arduino,raspberry-pi,esp32,esp8266,embedded,mqtt,sensor,home-automation', 14, @now, @now),
 ('Blockchain', 'blockchain', 'Smart contracts and decentralised applications.', 'blockchain,ethereum,solidity,smart-contracts,web3,dapp,cryptocurrency,hyperledger', 15, @now, @now),
 ('Computer Vision', 'computer-vision', 'Image and video understanding projects.', 'computer-vision,opencv,image-processing,object-detection,face-recognition,yolo,image-classification,ocr,segmentation', 16, @now, @now),
 ('Natural Language Processing', 'natural-language-processing', 'Text, speech and language projects.', 'nlp,natural-language-processing,sentiment-analysis,text-classification,bert,speech-recognition,translation,summarization,nltk,spacy', 17, @now, @now),
 ('Data Analytics', 'data-analytics', 'Dashboards, reporting and business analytics.', 'data-analytics,analytics,dashboard,power-bi,tableau,visualization,data-visualization,sql,excel,business-intelligence', 18, @now, @now),
 ('Automation', 'automation', 'Bots, scrapers, scripting and workflow automation.', 'automation,bot,selenium,scraper,web-scraping,rpa,scripting,workflow', 19, @now, @now),
 ('Software Engineering', 'software-engineering', 'Management systems, tools and general software projects.', 'management-system,software-engineering,design-patterns,testing,compiler,operating-system,database,library-management,inventory', 20, @now, @now);

INSERT INTO technologies (name, slug, aliases, is_language, created_at, updated_at) VALUES
 ('Java', 'java', 'java', TRUE, @now, @now),
 ('Python', 'python', 'python,python3', TRUE, @now, @now),
 ('JavaScript', 'javascript', 'javascript,js', TRUE, @now, @now),
 ('TypeScript', 'typescript', 'typescript,ts', TRUE, @now, @now),
 ('C++', 'cpp', 'c++,cpp', TRUE, @now, @now),
 ('C#', 'csharp', 'c#,csharp', TRUE, @now, @now),
 ('C', 'c', 'c', TRUE, @now, @now),
 ('PHP', 'php', 'php', TRUE, @now, @now),
 ('Kotlin', 'kotlin', 'kotlin', TRUE, @now, @now),
 ('Dart', 'dart', 'dart', TRUE, @now, @now),
 ('Go', 'go', 'go,golang', TRUE, @now, @now),
 ('Swift', 'swift', 'swift', TRUE, @now, @now),
 ('R', 'r', 'r', TRUE, @now, @now),
 ('Solidity', 'solidity', 'solidity', TRUE, @now, @now),
 ('Jupyter Notebook', 'jupyter-notebook', 'jupyter notebook,jupyter-notebook,jupyter,ipynb', TRUE, @now, @now),
 ('HTML', 'html', 'html,html5', TRUE, @now, @now),
 ('CSS', 'css', 'css,css3', TRUE, @now, @now),
 ('Spring Boot', 'spring-boot', 'spring-boot,springboot,spring boot,spring', FALSE, @now, @now),
 ('Hibernate', 'hibernate', 'hibernate,jpa', FALSE, @now, @now),
 ('React', 'react', 'react,reactjs,react-js', FALSE, @now, @now),
 ('Next.js', 'nextjs', 'nextjs,next.js,next-js', FALSE, @now, @now),
 ('Angular', 'angular', 'angular,angularjs', FALSE, @now, @now),
 ('Vue', 'vue', 'vue,vuejs,vue.js', FALSE, @now, @now),
 ('Node.js', 'nodejs', 'nodejs,node.js,node-js,node', FALSE, @now, @now),
 ('Express', 'express', 'express,expressjs', FALSE, @now, @now),
 ('Django', 'django', 'django', FALSE, @now, @now),
 ('Flask', 'flask', 'flask', FALSE, @now, @now),
 ('FastAPI', 'fastapi', 'fastapi', FALSE, @now, @now),
 ('Laravel', 'laravel', 'laravel', FALSE, @now, @now),
 ('Flutter', 'flutter', 'flutter', FALSE, @now, @now),
 ('React Native', 'react-native', 'react-native,react native', FALSE, @now, @now),
 ('Android', 'android', 'android,android-studio', FALSE, @now, @now),
 ('TensorFlow', 'tensorflow', 'tensorflow,tf', FALSE, @now, @now),
 ('PyTorch', 'pytorch', 'pytorch,torch', FALSE, @now, @now),
 ('Keras', 'keras', 'keras', FALSE, @now, @now),
 ('scikit-learn', 'scikit-learn', 'scikit-learn,sklearn', FALSE, @now, @now),
 ('OpenCV', 'opencv', 'opencv,cv2', FALSE, @now, @now),
 ('Pandas', 'pandas', 'pandas', FALSE, @now, @now),
 ('NumPy', 'numpy', 'numpy', FALSE, @now, @now),
 ('Streamlit', 'streamlit', 'streamlit', FALSE, @now, @now),
 ('MySQL', 'mysql', 'mysql', FALSE, @now, @now),
 ('PostgreSQL', 'postgresql', 'postgresql,postgres', FALSE, @now, @now),
 ('MongoDB', 'mongodb', 'mongodb,mongo', FALSE, @now, @now),
 ('SQLite', 'sqlite', 'sqlite,sqlite3', FALSE, @now, @now),
 ('Firebase', 'firebase', 'firebase,firestore', FALSE, @now, @now),
 ('Docker', 'docker', 'docker,docker-compose', FALSE, @now, @now),
 ('Kubernetes', 'kubernetes', 'kubernetes,k8s', FALSE, @now, @now),
 ('AWS', 'aws', 'aws,amazon-web-services', FALSE, @now, @now),
 ('Arduino', 'arduino', 'arduino', FALSE, @now, @now),
 ('Raspberry Pi', 'raspberry-pi', 'raspberry-pi,raspberrypi,raspberry pi', FALSE, @now, @now),
 ('Ethereum', 'ethereum', 'ethereum,web3', FALSE, @now, @now),
 ('Selenium', 'selenium', 'selenium', FALSE, @now, @now),
 ('Tailwind CSS', 'tailwind-css', 'tailwindcss,tailwind,tailwind-css', FALSE, @now, @now),
 ('Bootstrap', 'bootstrap', 'bootstrap', FALSE, @now, @now),
 ('Hugging Face Transformers', 'transformers', 'transformers,huggingface,hugging-face', FALSE, @now, @now),
 ('YOLO', 'yolo', 'yolo,yolov5,yolov8', FALSE, @now, @now);
