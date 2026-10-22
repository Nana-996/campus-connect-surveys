
-- Layer 1: curated global universities directory (name, email domain, country)
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.universities TO anon, authenticated;
GRANT ALL ON public.universities TO service_role;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Universities are publicly readable"
  ON public.universities FOR SELECT TO anon, authenticated USING (true);

-- Seed: Ghana, West Africa, Africa, then major global universities.
INSERT INTO public.universities (name, domain, country) VALUES
-- Ghana
('University of Ghana','ug.edu.gh','Ghana'),
('Kwame Nkrumah University of Science and Technology','knust.edu.gh','Ghana'),
('University of Cape Coast','ucc.edu.gh','Ghana'),
('University of Health and Allied Sciences','uhas.edu.gh','Ghana'),
('University of Mines and Technology','umat.edu.gh','Ghana'),
('Accra Technical University','atu.edu.gh','Ghana'),
('University for Development Studies','uds.edu.gh','Ghana'),
('University of Education, Winneba','uew.edu.gh','Ghana'),
('University of Energy and Natural Resources','uenr.edu.gh','Ghana'),
('University of Professional Studies, Accra','upsa.edu.gh','Ghana'),
('Ghana Institute of Management and Public Administration','gimpa.edu.gh','Ghana'),
('Central University','central.edu.gh','Ghana'),
('Ashesi University','ashesi.edu.gh','Ghana'),
('Pentecost University','pentvars.edu.gh','Ghana'),
('Valley View University','vvu.edu.gh','Ghana'),
('Kumasi Technical University','kstu.edu.gh','Ghana'),
('Koforidua Technical University','ktu.edu.gh','Ghana'),
('Ho Technical University','htu.edu.gh','Ghana'),
('Takoradi Technical University','ttu.edu.gh','Ghana'),
('Sunyani Technical University','stu.edu.gh','Ghana'),
('Cape Coast Technical University','cctu.edu.gh','Ghana'),
('Methodist University Ghana','mucg.edu.gh','Ghana'),
('Garden City University','gcuc.edu.gh','Ghana'),
('All Nations University','anuc.edu.gh','Ghana'),
('Wisconsin International University College','wiuc.edu.gh','Ghana'),
('Ghana Communication Technology University','gctu.edu.gh','Ghana'),
('SD Dombo University of Business and Integrated Development Studies','ubids.edu.gh','Ghana'),
('C.K. Tedam University of Technology and Applied Sciences','cktutas.edu.gh','Ghana'),
('Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development','aamusted.edu.gh','Ghana'),
('University of Media, Arts and Communication','unimac.edu.gh','Ghana'),
-- Nigeria
('University of Lagos','unilag.edu.ng','Nigeria'),
('University of Ibadan','ui.edu.ng','Nigeria'),
('Obafemi Awolowo University','oauife.edu.ng','Nigeria'),
('University of Nigeria, Nsukka','unn.edu.ng','Nigeria'),
('Ahmadu Bello University','abu.edu.ng','Nigeria'),
('University of Benin','uniben.edu','Nigeria'),
('Federal University of Technology, Akure','futa.edu.ng','Nigeria'),
('University of Ilorin','unilorin.edu.ng','Nigeria'),
('Lagos State University','lasu.edu.ng','Nigeria'),
('Nnamdi Azikiwe University','unizik.edu.ng','Nigeria'),
('Federal University Oye-Ekiti','fuoye.edu.ng','Nigeria'),
('Yaba College of Technology','yabatech.edu.ng','Nigeria'),
('Evangel University','evangeluniversity.edu.ng','Nigeria'),
('Covenant University','covenantuniversity.edu.ng','Nigeria'),
('Babcock University','babcock.edu.ng','Nigeria'),
('American University of Nigeria','aun.edu.ng','Nigeria'),
('University of Port Harcourt','uniport.edu.ng','Nigeria'),
('University of Calabar','unical.edu.ng','Nigeria'),
('University of Jos','unijos.edu.ng','Nigeria'),
('Bayero University Kano','buk.edu.ng','Nigeria'),
('Federal University of Technology, Owerri','futo.edu.ng','Nigeria'),
('Ladoke Akintola University of Technology','lautech.edu.ng','Nigeria'),
('Federal University of Technology, Minna','futminna.edu.ng','Nigeria'),
-- Kenya
('University of Nairobi','uonbi.ac.ke','Kenya'),
('Kenyatta University','ku.ac.ke','Kenya'),
('Jomo Kenyatta University of Agriculture and Technology','jkuat.ac.ke','Kenya'),
('Mount Kenya University','mku.ac.ke','Kenya'),
('Strathmore University','strathmore.edu','Kenya'),
('United States International University Africa','usiu.ac.ke','Kenya'),
('Egerton University','egerton.ac.ke','Kenya'),
('Maseno University','maseno.ac.ke','Kenya'),
('Kisii University','kisiiuniversity.ac.ke','Kenya'),
('Moi University','mu.ac.ke','Kenya'),
('Technical University of Kenya','tukenya.ac.ke','Kenya'),
-- South Africa
('University of Cape Town','uct.ac.za','South Africa'),
('University of the Witwatersrand','wits.ac.za','South Africa'),
('Stellenbosch University','sun.ac.za','South Africa'),
('University of Pretoria','up.ac.za','South Africa'),
('University of Johannesburg','uj.ac.za','South Africa'),
('University of KwaZulu-Natal','ukzn.ac.za','South Africa'),
('Rhodes University','ru.ac.za','South Africa'),
('University of South Africa','unisa.ac.za','South Africa'),
('North-West University','nwu.ac.za','South Africa'),
('University of the Free State','ufs.ac.za','South Africa'),
('Cape Peninsula University of Technology','cput.ac.za','South Africa'),
('University of the Western Cape','uwc.ac.za','South Africa'),
('Durban University of Technology','dut.ac.za','South Africa'),
-- East & Southern Africa
('University of Rwanda','ur.ac.rw','Rwanda'),
('INES Ruhengeri','ines.ac.rw','Rwanda'),
('Makerere University','mak.ac.ug','Uganda'),
('Kyambogo University','kyu.ac.ug','Uganda'),
('Uganda Christian University','ucu.ac.ug','Uganda'),
('Mbarara University of Science and Technology','must.ac.ug','Uganda'),
('University of Dar es Salaam','udsm.ac.tz','Tanzania'),
('Sokoine University of Agriculture','sua.ac.tz','Tanzania'),
('Ardhi University','aru.ac.tz','Tanzania'),
('Muhimbili University of Health and Allied Sciences','muhas.ac.tz','Tanzania'),
('University of Zambia','unza.zm','Zambia'),
('Copperbelt University','cbu.ac.zm','Zambia'),
('Manica University','manicauniversity.edu','Zambia'),
('Mulungushi University','mu.ac.zm','Zambia'),
('University of Zimbabwe','uz.ac.zw','Zimbabwe'),
('National University of Science and Technology','nust.ac.zw','Zimbabwe'),
('Harare Institute of Technology','hit.ac.zw','Zimbabwe'),
('Midlands State University','msu.ac.zw','Zimbabwe'),
('Addis Ababa University','aau.edu.et','Ethiopia'),
('Jimma University','ju.edu.et','Ethiopia'),
('Bahir Dar University','bdu.edu.et','Ethiopia'),
('Hawassa University','hu.edu.et','Ethiopia'),
('University of Khartoum','uofk.edu','Sudan'),
('University of Gezira','uofg.edu.sd','Sudan'),
('University of Botswana','ub.bw','Botswana'),
('University of Namibia','unam.na','Namibia'),
('University of Malawi','unima.ac.mw','Malawi'),
-- North & Francophone Africa
('Cairo University','cu.edu.eg','Egypt'),
('Ain Shams University','asu.edu.eg','Egypt'),
('Alexandria University','alexu.edu.eg','Egypt'),
('American University in Cairo','aucegypt.edu','Egypt'),
('Cheikh Anta Diop University','ucad.sn','Senegal'),
('Université Félix Houphouët-Boigny','ufhb.edu.ci','Côte d''Ivoire'),
-- United States
('Harvard University','harvard.edu','United States'),
('Stanford University','stanford.edu','United States'),
('Massachusetts Institute of Technology','mit.edu','United States'),
('Yale University','yale.edu','United States'),
('Princeton University','princeton.edu','United States'),
('Columbia University','columbia.edu','United States'),
('University of Pennsylvania','upenn.edu','United States'),
('Cornell University','cornell.edu','United States'),
('University of California, Berkeley','berkeley.edu','United States'),
('University of California, Los Angeles','ucla.edu','United States'),
('University of Michigan','umich.edu','United States'),
('New York University','nyu.edu','United States'),
('Carnegie Mellon University','cmu.edu','United States'),
('Georgia Institute of Technology','gatech.edu','United States'),
('University of Texas at Austin','utexas.edu','United States'),
('University of Washington','washington.edu','United States'),
('University of Illinois Urbana-Champaign','illinois.edu','United States'),
('University of California, San Diego','ucsd.edu','United States'),
('Boston University','bu.edu','United States'),
('Duke University','duke.edu','United States'),
('Northwestern University','northwestern.edu','United States'),
('University of Chicago','uchicago.edu','United States'),
('Pennsylvania State University','psu.edu','United States'),
('Ohio State University','osu.edu','United States'),
('Purdue University','purdue.edu','United States'),
-- United Kingdom
('University of Oxford','ox.ac.uk','United Kingdom'),
('University of Cambridge','cam.ac.uk','United Kingdom'),
('Imperial College London','imperial.ac.uk','United Kingdom'),
('University College London','ucl.ac.uk','United Kingdom'),
('London School of Economics and Political Science','lse.ac.uk','United Kingdom'),
('University of Edinburgh','ed.ac.uk','United Kingdom'),
('University of Manchester','manchester.ac.uk','United Kingdom'),
('King''s College London','kcl.ac.uk','United Kingdom'),
('University of Bristol','bristol.ac.uk','United Kingdom'),
('University of Warwick','warwick.ac.uk','United Kingdom'),
('University of Leeds','leeds.ac.uk','United Kingdom'),
('University of Nottingham','nottingham.ac.uk','United Kingdom'),
('University of Sheffield','sheffield.ac.uk','United Kingdom'),
('University of Birmingham','birmingham.ac.uk','United Kingdom'),
('University of Glasgow','glasgow.ac.uk','United Kingdom'),
('University of Southampton','southampton.ac.uk','United Kingdom'),
('Durham University','durham.ac.uk','United Kingdom'),
('Queen Mary University of London','qmul.ac.uk','United Kingdom'),
('University of Liverpool','liverpool.ac.uk','United Kingdom'),
('Newcastle University','newcastle.ac.uk','United Kingdom'),
-- Canada
('University of Toronto','utoronto.ca','Canada'),
('McGill University','mcgill.ca','Canada'),
('University of British Columbia','ubc.ca','Canada'),
('University of Waterloo','uwaterloo.ca','Canada'),
('University of Alberta','ualberta.ca','Canada'),
('McMaster University','mcmaster.ca','Canada'),
('Queen''s University','queensu.ca','Canada'),
('Western University','uwo.ca','Canada'),
('University of Calgary','ucalgary.ca','Canada'),
('University of Ottawa','uottawa.ca','Canada'),
-- Australia
('University of Melbourne','unimelb.edu.au','Australia'),
('University of Sydney','sydney.edu.au','Australia'),
('University of New South Wales','unsw.edu.au','Australia'),
('Australian National University','anu.edu.au','Australia'),
('Monash University','monash.edu','Australia'),
('University of Queensland','uq.edu.au','Australia'),
('University of Western Australia','uwa.edu.au','Australia'),
('University of Adelaide','adelaide.edu.au','Australia'),
('University of Technology Sydney','uts.edu.au','Australia'),
('RMIT University','rmit.edu.au','Australia'),
-- Europe
('ETH Zurich','ethz.ch','Switzerland'),
('EPFL','epfl.ch','Switzerland'),
('University of Zurich','uzh.ch','Switzerland'),
('Technical University of Munich','tum.de','Germany'),
('Ludwig Maximilian University of Munich','lmu.de','Germany'),
('Heidelberg University','uni-heidelberg.de','Germany'),
('Free University of Berlin','fu-berlin.de','Germany'),
('RWTH Aachen University','rwth-aachen.de','Germany'),
('Karlsruhe Institute of Technology','kit.edu','Germany'),
('Delft University of Technology','tudelft.nl','Netherlands'),
('University of Amsterdam','uva.nl','Netherlands'),
('Eindhoven University of Technology','tue.nl','Netherlands'),
('Wageningen University & Research','wur.nl','Netherlands'),
('Leiden University','leidenuniv.nl','Netherlands'),
('Utrecht University','uu.nl','Netherlands'),
('University of Copenhagen','ku.dk','Denmark'),
('KTH Royal Institute of Technology','kth.se','Sweden'),
('Chalmers University of Technology','chalmers.se','Sweden'),
('University of Helsinki','helsinki.fi','Finland'),
('Aalto University','aalto.fi','Finland'),
('University of Oslo','uio.no','Norway'),
('Norwegian University of Science and Technology','ntnu.no','Norway'),
('Sorbonne University','sorbonne-universite.fr','France'),
('Paris Sciences et Lettres University','psl.eu','France'),
('École Polytechnique','polytechnique.edu','France'),
('KU Leuven','kuleuven.be','Belgium'),
('Ghent University','ugent.be','Belgium'),
('Bocconi University','unibocconi.it','Italy'),
('Polytechnic University of Milan','polimi.it','Italy'),
('Sapienza University of Rome','uniroma1.it','Italy'),
('Polytechnic University of Catalonia','upc.edu','Spain'),
('Complutense University of Madrid','ucm.es','Spain'),
('University of Barcelona','ub.edu','Spain'),
('University of Vienna','univie.ac.at','Austria'),
('Trinity College Dublin','tcd.ie','Ireland'),
('University College Dublin','ucd.ie','Ireland'),
-- Asia
('National University of Singapore','nus.edu.sg','Singapore'),
('Nanyang Technological University','ntu.edu.sg','Singapore'),
('Tsinghua University','tsinghua.edu.cn','China'),
('Peking University','pku.edu.cn','China'),
('Fudan University','fudan.edu.cn','China'),
('Zhejiang University','zju.edu.cn','China'),
('Shanghai Jiao Tong University','sjtu.edu.cn','China'),
('University of Tokyo','u-tokyo.ac.jp','Japan'),
('Kyoto University','kyoto-u.ac.jp','Japan'),
('Seoul National University','snu.ac.kr','South Korea'),
('KAIST','kaist.ac.kr','South Korea'),
('University of Hong Kong','hku.hk','Hong Kong'),
('Chinese University of Hong Kong','cuhk.edu.hk','Hong Kong'),
('Hong Kong University of Science and Technology','ust.hk','Hong Kong'),
('Indian Institute of Technology Bombay','iitb.ac.in','India'),
('Indian Institute of Technology Delhi','iitd.ac.in','India'),
('Indian Institute of Science','iisc.ac.in','India'),
('Indian Institute of Technology Madras','iitm.ac.in','India'),
('Indian Institute of Technology Kanpur','iitk.ac.in','India'),
('University of Delhi','du.ac.in','India'),
('BITS Pilani','bits-pilani.ac.in','India'),
('University of Malaya','um.edu.my','Malaysia'),
('Universiti Putra Malaysia','upm.edu.my','Malaysia'),
('Chulalongkorn University','chula.ac.th','Thailand'),
('Mahidol University','mahidol.ac.th','Thailand'),
-- Middle East & Latin America
('Technion – Israel Institute of Technology','technion.ac.il','Israel'),
('Tel Aviv University','tau.ac.il','Israel'),
('Hebrew University of Jerusalem','huji.ac.il','Israel'),
('King Abdullah University of Science and Technology','kaust.edu.sa','Saudi Arabia'),
('King Fahd University of Petroleum and Minerals','kfupm.edu.sa','Saudi Arabia'),
('Qatar University','qu.edu.qa','Qatar'),
('University of São Paulo','usp.br','Brazil'),
('University of Campinas','unicamp.br','Brazil'),
('University of Buenos Aires','uba.ar','Argentina'),
('National Autonomous University of Mexico','unam.mx','Mexico'),
('Monterrey Institute of Technology','tec.mx','Mexico'),
('University of Chile','uchile.cl','Chile'),
('Pontifical Catholic University of Chile','puc.cl','Chile'),
('University of the Andes','uniandes.edu.co','Colombia'),
('National University of Colombia','unal.edu.co','Colombia')
ON CONFLICT (domain) DO NOTHING;

-- Layer 2 support: fast search for the signup picker (2+ chars, ranked, max 8)
CREATE OR REPLACE FUNCTION public.search_universities(q text)
RETURNS TABLE(name text, domain text, country text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.name, u.domain, u.country
  FROM public.universities u
  WHERE length(trim(COALESCE(q,''))) >= 2
    AND (u.name ILIKE '%' || trim(q) || '%' OR u.domain ILIKE '%' || trim(q) || '%')
  ORDER BY
    CASE WHEN lower(u.name) LIKE lower(trim(q)) || '%' THEN 0
         WHEN lower(u.name) LIKE '% ' || lower(trim(q)) || '%' THEN 1
         ELSE 2 END,
    u.name
  LIMIT 8
$$;
GRANT EXECUTE ON FUNCTION public.search_universities(text) TO anon, authenticated;

-- Layer 3: the email domain decides the school name. The curated directory now
-- outranks partner schools, crowd names, typed text, and the old
-- "<domain-part> University" guess. Auto-generated junk names (e.g. "Ug
-- University") are excluded from the crowd fallback so they can never win.
CREATE OR REPLACE FUNCTION public.canonical_university_name(_domain text, _typed text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT u.name FROM public.universities u
       WHERE lower(u.domain) = lower(_domain) OR lower(_domain) LIKE '%.' || lower(u.domain)
       ORDER BY length(u.domain) DESC LIMIT 1),
    (SELECT s.name FROM public.schools s
       WHERE lower(s.domain) = lower(_domain) OR lower(_domain) LIKE '%.' || lower(s.domain)
       ORDER BY length(s.domain) DESC LIMIT 1),
    (SELECT p.university_name FROM public.profiles p
       WHERE p.university_domain = lower(_domain) AND p.user_type = 'student'
         AND coalesce(trim(p.university_name),'') <> ''
         AND lower(p.university_name) <> lower(initcap(split_part(p.university_domain,'.',1)) || ' university')
       GROUP BY p.university_name ORDER BY count(*) DESC, min(p.created_at) ASC LIMIT 1),
    NULLIF(trim(_typed), ''),
    initcap(split_part(lower(_domain),'.',1)) || ' University'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.canonical_university_name(text, text) FROM PUBLIC, anon, authenticated;

-- Backfill: re-resolve every existing student's school name from their domain.
DO $$
DECLARE r record;
BEGIN
  ALTER TABLE public.profiles DISABLE TRIGGER USER;
  FOR r IN SELECT DISTINCT university_domain d FROM public.profiles WHERE user_type='student' AND coalesce(university_domain,'')<>'' LOOP
    UPDATE public.profiles SET university_name = public.canonical_university_name(r.d, NULL)
     WHERE user_type='student' AND university_domain = r.d
       AND university_name IS DISTINCT FROM public.canonical_university_name(r.d, NULL);
  END LOOP;
  ALTER TABLE public.profiles ENABLE TRIGGER USER;
END $$;
